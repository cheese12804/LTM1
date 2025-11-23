/**
 * WebRTC Client để nhận video stream từ server
 */
class WebRTCClient {

    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteVideo = document.getElementById('remoteVideo');
        this.pendingCandidates = [];
        this.addedRemoteCandidatesCount = 0;
        this.controlChannel = null;    // DataChannel cho chuột/phím
        this.isHost = false;          // Máy đang share màn hình

        // Dùng LAN / Radmin VPN → KHÔNG dùng STUN/TURN
        this.configuration = {
            iceServers: [],           // bỏ hết STUN, chỉ dùng host candidate (26.x.x.x)
            iceCandidatePoolSize: 0
        };
    }

    async startScreenShare() {
        try {
            this.stopScreenShare();
            updateStatus("Đang yêu cầu chia sẻ màn hình...");
            
            this.localStream = await navigator.mediaDevices.getDisplayMedia({
                video: { 
                    cursor: "always",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            
            updateStatus("Đã bắt đầu chia sẻ màn hình");
            this.createPeerConnection();
            
            // Đánh dấu máy này là HOST
            this.isHost = true;
            
            // Tạo DataChannel cho control
            this.controlChannel = this.peerConnection.createDataChannel("control");
            
            this.controlChannel.onopen = () => {
                console.log("✅ DataChannel 'control' (host) OPEN");
            };
            
            this.controlChannel.onclose = () => {
                console.log("⚠️ DataChannel 'control' CLOSED (host)");
            };
            
            this.controlChannel.onmessage = (ev) => {
                console.log("📥 [HOST] Nhận message control:", ev.data);
                
                let msg;
                try {
                    msg = JSON.parse(ev.data);
                } catch (e) {
                    console.error("Không parse được JSON control:", e);
                    return;
                }
                
                // Gửi xuống Java Robot qua HTTP local
                fetch('/api/control', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(msg)
                }).catch(err => {
                    console.error("Lỗi gọi /api/control:", err);
                });
            };
            
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            const offer = await this.peerConnection.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: false
            });
            
            await this.peerConnection.setLocalDescription(offer);
            
            const offerData = {
                type: offer.type,
                sdp: typeof offer.sdp === 'string' ? offer.sdp : String(offer.sdp)
            };
            wsClient.sendWebRTCSignal(JSON.stringify(offerData));
            
            const placeholder = document.getElementById('videoPlaceholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            this.localStream.getVideoTracks()[0].onended = () => {
                this.stopScreenShare();
            };
            
        } catch (error) {
            console.error("❌ Lỗi chia sẻ màn hình:", error);
            updateStatus("Lỗi: " + error.message);
            throw error;
        }
    }
    
    stopScreenShare() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        this.isHost = false;
        this.cleanupPeerConnection();
        
        if (this.remoteVideo) {
            this.remoteVideo.srcObject = null;
            this.remoteVideo.style.display = 'none';
        }
        
        const placeholder = document.getElementById('videoPlaceholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
        
        if (typeof window !== 'undefined') {
            window.isReceivingVideo = false;
        }
        
        updateStatus("Đã dừng chia sẻ màn hình");
    }
    
    cleanupPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.getReceivers().forEach(receiver => {
                if (receiver.track) receiver.track.stop();
            });
            
            this.peerConnection.getSenders().forEach(sender => {
                if (sender.track) sender.track.stop();
            });
            
            try {
                this.peerConnection.close();
            } catch (error) {
                console.warn("Lỗi khi đóng peer connection:", error);
            }
            
            this.peerConnection = null;
        }
        
        this.pendingCandidates = [];
        
        if (this.remoteVideo) {
            this.remoteVideo.srcObject = null;
            if (this.tryPlayVideo) {
                this.tryPlayVideo = null;
            }
        }
        
        if (typeof window !== 'undefined') {
            window.isReceivingVideo = false;
        }
    }
    
    createPeerConnection() {
        this.cleanupPeerConnection();
        this.addedRemoteCandidatesCount = 0;
        
        this.peerConnection = new RTCPeerConnection(this.configuration);
        
        this.peerConnection.ondatachannel = (event) => {
            console.log("📡 Nhận DataChannel:", event.channel.label);
            if (event.channel.label === "control") {
                this.controlChannel = event.channel;
                
                this.controlChannel.onopen = () => {
                    console.log("✅ DataChannel 'control' (viewer) OPEN");
                };
                
                this.controlChannel.onclose = () => {
                    console.log("⚠️ DataChannel 'control' CLOSED (viewer)");
                };
                
                this.controlChannel.onmessage = (ev) => {
                    console.log("📥 [VIEWER] Nhận message control:", ev.data);
                };
            }
        };
        
        this.peerConnection.ontrack = (event) => {
            const stream = event.streams && event.streams.length > 0 
                ? event.streams[0] 
                : (event.track ? new MediaStream([event.track]) : null);
            
            if (this.remoteVideo && stream) {
                stream.getTracks().forEach(track => {
                    if (!track.enabled) track.enabled = true;
                });
                
                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.onunmute = () => {
                        if (this.remoteVideo && this.remoteVideo.paused) {
                            setTimeout(() => {
                                this.tryPlayVideo(true);
                            }, 100);
                        }
                    };
                }
                
                this.remoteVideo.removeAttribute('style');
                this.remoteVideo.style.display = 'block';
                this.remoteVideo.style.visibility = 'visible';
                this.remoteVideo.style.opacity = '1';
                this.remoteVideo.style.width = '100%';
                this.remoteVideo.style.height = 'auto';
                this.remoteVideo.style.maxWidth = '100%';
                this.remoteVideo.style.maxHeight = '70vh';
                
                const placeholder = document.getElementById('videoPlaceholder');
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
                
                this.remoteVideo.srcObject = stream;
                
                this.tryPlayVideo = (force = false) => {
                    return Promise.resolve().then(() => {
                        if (!this.remoteVideo || !this.remoteVideo.srcObject) {
                            return false;
                        }
                        
                        if (!force && this.peerConnection) {
                            const iceState = this.peerConnection.iceConnectionState;
                            if (iceState === "failed") {
                                return false;
                            }
                            
                            if (iceState === "new" && !force) {
                                const videoTrack = this.remoteVideo.srcObject.getVideoTracks()[0];
                                if (videoTrack && videoTrack.muted) {
                                    return false;
                                }
                            }
                        }
                        
                        if (!force && this.remoteVideo.readyState < 2) {
                            return false;
                        }
                        
                        if (!force && (this.remoteVideo.videoWidth === 0 || this.remoteVideo.videoHeight === 0)) {
                            return false;
                        }
                        
                        this.remoteVideo.style.display = 'block';
                        this.remoteVideo.style.visibility = 'visible';
                        
                        return this.remoteVideo.play().then(() => {
                            return new Promise((resolve) => {
                                const checkDimensions = () => {
                                    if (this.remoteVideo.videoWidth > 0 && this.remoteVideo.videoHeight > 0) {
                                        updateStatus("✅ Đã nhận và hiển thị video stream!");
                                        resolve(true);
                                    } else {
                                        setTimeout(checkDimensions, 100);
                                    }
                                };
                                
                                checkDimensions();
                                
                                setTimeout(() => {
                                    if (this.remoteVideo.videoWidth === 0 || this.remoteVideo.videoHeight === 0) {
                                        resolve(false);
                                    }
                                }, 3000);
                            });
                        }).catch((error) => {
                            console.error("❌ Lỗi play video:", error);
                            return false;
                        });
                    });
                };
                
                let playAttempts = 0;
                const maxPlayAttempts = 40;
                let hasPlayed = false;
                
                const tryPlay = () => {
                    if (hasPlayed) return;
                    
                    if (playAttempts >= maxPlayAttempts) {
                        this.tryPlayVideo(true).then((success) => {
                            if (success) hasPlayed = true;
                        });
                        return;
                    }
                    
                    playAttempts++;
                    this.tryPlayVideo().then((success) => {
                        if (success) {
                            hasPlayed = true;
                        } else if (this.remoteVideo && this.remoteVideo.paused) {
                            setTimeout(tryPlay, 300);
                        }
                    });
                };
                
                setTimeout(tryPlay, 100);
                
                this.remoteVideo.onloadedmetadata = () => {
                    if (this.remoteVideo.paused && this.remoteVideo.videoWidth > 0 && this.remoteVideo.videoHeight > 0) {
                        this.remoteVideo.play().catch((error) => {
                            console.error("❌ Lỗi play:", error);
                        });
                    }
                    
                    if (typeof setupInputHandlers === 'function') {
                        setupInputHandlers();
                    }
                };
                
                this.remoteVideo.onerror = (error) => {
                    console.error("❌ Video error:", error);
                };
                
                if (typeof window !== 'undefined') {
                    window.isReceivingVideo = true;
                }
            } else {
                console.error("❌ Không có stream hoặc video element!");
            }
        };
        
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            updateStatus("WebRTC: " + state);
            
            if (state === "connected") {
                updateStatus("✅ WebRTC: Đã kết nối với peer");
                if (this.remoteVideo && this.remoteVideo.srcObject) {
                    setTimeout(() => {
                        if (typeof this.tryPlayVideo === 'function') {
                            this.tryPlayVideo();
                        }
                    }, 200);
                }
            } else if (state === "failed" || state === "disconnected") {
                updateStatus("⚠️ WebRTC: " + state);
            }
        };
        
        // Log ICE candidates để kiểm tra P2P có hoạt động hay không
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                const candidateStr = event.candidate.candidate;
                console.log("ICE candidate:", candidateStr);
                
                // Phân tích loại candidate
                if (candidateStr.includes("typ srflx")) {
                    console.log("✅ NAT hợp tác (server reflexive) - P2P direct có khả năng thành công");
                } else if (candidateStr.includes("typ relay")) {
                    console.log("⚠️ Đang dùng TURN (relay) - không phải P2P thuần");
                } else if (candidateStr.includes("typ host")) {
                    console.log("ℹ️ Chỉ có host candidate (local)");
                }
                
                const candidateMessage = {
                    type: "ice-candidate",
                    candidate: event.candidate
                };
                wsClient.sendWebRTCSignal(JSON.stringify(candidateMessage));
            } else {
                console.log("ICE gathering finished");
            }
        };
        
        // Log trạng thái ICE (rất quan trọng)
        this.peerConnection.oniceconnectionstatechange = () => {
            const iceState = this.peerConnection.iceConnectionState;
            console.log("ICE state:", iceState);
            
            if (iceState === "checking") {
                updateStatus("🔄 WebRTC: Đang kiểm tra kết nối...");
            } else if (iceState === "connected") {
                updateStatus("✅ WebRTC: Đã kết nối P2P");
                if (this.remoteVideo && this.remoteVideo.srcObject) {
                    setTimeout(() => {
                        if (typeof this.tryPlayVideo === 'function') {
                            this.tryPlayVideo();
                        }
                    }, 200);
                }
            } else if (iceState === "completed") {
                updateStatus("✅ WebRTC: Kết nối hoàn tất");
            } else if (iceState === "failed") {
                console.error("❌ ICE connection failed");
                updateStatus("❌ ICE connection failed");
            } else if (iceState === "disconnected") {
                updateStatus("⚠️ WebRTC: Đã ngắt kết nối");
            }
        };
        
        this.peerConnection.onicegatheringstatechange = () => {
            if (this.peerConnection.iceGatheringState === "complete") {
                if (this.remoteVideo && this.remoteVideo.srcObject) {
                    setTimeout(() => {
                        if (typeof this.tryPlayVideo === 'function') {
                            this.tryPlayVideo();
                        }
                    }, 300);
                }
            }
        };
    }
    
    async handleSignal(signal) {
        try {
            let message;
            if (typeof signal === 'string') {
                message = JSON.parse(signal);
            } else {
                message = signal;
            }
            
            if (message.type === "offer") {
                if (!message.sdp) {
                    console.error("❌ Offer không có SDP!");
                    updateStatus("Lỗi: Offer không có SDP");
                    return;
                }
                
                let sdpString = message.sdp;
                if (typeof sdpString !== 'string') {
                    if (typeof sdpString === 'object' && sdpString.sdp) {
                        sdpString = sdpString.sdp;
                    } else {
                        sdpString = String(sdpString);
                    }
                }
                
                if (!sdpString.startsWith('v=')) {
                    console.error("❌ SDP không đúng format!");
                    updateStatus("Lỗi: SDP không đúng format");
                    return;
                }
                
                if (!this.peerConnection) {
                    this.createPeerConnection();
                }
                
                try {
                    const offerDesc = new RTCSessionDescription({
                        type: message.type,
                        sdp: sdpString
                    });
                    
                    await this.peerConnection.setRemoteDescription(offerDesc);
                    
                    for (const c of this.pendingCandidates) {
                        await this.peerConnection.addIceCandidate(c);
                        this.addedRemoteCandidatesCount++;
                    }
                    this.pendingCandidates = [];
                    
                    const answer = await this.peerConnection.createAnswer({
                        offerToReceiveVideo: true,
                        offerToReceiveAudio: false
                    });
                    await this.peerConnection.setLocalDescription(answer);
                    
                    const answerData = {
                        type: answer.type,
                        sdp: typeof answer.sdp === 'string' ? answer.sdp : String(answer.sdp)
                    };
                    wsClient.sendWebRTCSignal(JSON.stringify(answerData));
                } catch (error) {
                    console.error("❌ Lỗi xử lý offer:", error);
                    updateStatus("Lỗi xử lý offer: " + error.message);
                }
                
            } else if (message.type === "answer") {
                if (!this.peerConnection) {
                    console.error("❌ Không có peer connection khi nhận answer!");
                    updateStatus("Lỗi: Không có peer connection");
                    return;
                }
                
                if (!message.sdp) {
                    console.error("❌ Answer không có SDP!");
                    updateStatus("Lỗi: Answer không có SDP");
                    return;
                }
                
                let sdpString = message.sdp;
                if (typeof sdpString !== 'string') {
                    if (typeof sdpString === 'object' && sdpString.sdp) {
                        sdpString = sdpString.sdp;
                    } else {
                        sdpString = String(sdpString);
                    }
                }
                
                if (!sdpString.startsWith('v=')) {
                    console.error("❌ SDP không đúng format!");
                    updateStatus("Lỗi: SDP không đúng format");
                    return;
                }
                
                try {
                    const answerDesc = new RTCSessionDescription({
                        type: message.type,
                        sdp: sdpString
                    });
                    
                    await this.peerConnection.setRemoteDescription(answerDesc);
                    
                    if (this.pendingCandidates.length > 0) {
                        for (const c of this.pendingCandidates) {
                            await this.peerConnection.addIceCandidate(c);
                            this.addedRemoteCandidatesCount++;
                        }
                        this.pendingCandidates = [];
                    }
                } catch (error) {
                    console.error("❌ Lỗi set remote description (answer):", error);
                    updateStatus("Lỗi set answer: " + error.message);
                }
                
            } else if (message.type === "ice-candidate") {
                if (!this.peerConnection) {
                    return;
                }
                
                if (!message.candidate) {
                    return;
                }
                
                try {
                    const candidate = new RTCIceCandidate(message.candidate);
                    
                    if (this.peerConnection.remoteDescription) {
                        await this.peerConnection.addIceCandidate(candidate);
                        this.addedRemoteCandidatesCount++;
                    } else {
                        this.pendingCandidates.push(candidate);
                    }
                } catch (error) {
                    console.error("❌ Lỗi thêm ICE candidate:", error);
                }
            }
            
        } catch (error) {
            console.error("Lỗi xử lý signal:", error);
            updateStatus("Lỗi WebRTC: " + error.message);
        }
    }
    
    /**
     * Gửi message control (chuột/phím) qua DataChannel
     */
    sendControlMessage(payload) {
        if (this.controlChannel && this.controlChannel.readyState === "open") {
            try {
                const data = JSON.stringify(payload);
                this.controlChannel.send(data);
                // Debug:
                // console.log("📤 Gửi control qua DataChannel:", data);
            } catch (e) {
                console.error("❌ Lỗi gửi control qua DataChannel:", e);
            }
        } else {
            console.warn("⚠️ Control DataChannel chưa sẵn sàng");
        }
    }
}

const rtcClient = new WebRTCClient();

function handleWebRTCSignal(signalData) {
    rtcClient.handleSignal(signalData);
}
