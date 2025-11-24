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

        // Cấu hình ICE servers cho WebRTC
        // - STUN: Cần cho kết nối khác mạng (Internet)
        // - Để test LAN thuần: đổi thành iceServers: []
        // - Để dùng TURN: thêm { urls: 'turn:...', username: '...', credential: '...' }
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }, 
                { urls: 'stun:stun2.l.google.com:19302' }, 
                { urls: 'stun:stun.mozilla.org:3478' }
            ],
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
                // DataChannel opened
            };
            
            this.controlChannel.onclose = () => {
                // DataChannel closed
            };
            
            this.controlChannel.onmessage = (ev) => {
                let msg;
                try {
                    msg = JSON.parse(ev.data);
                } catch (e) {
                    return;
                }
                
                // Gửi xuống Java Robot qua HTTP local
                fetch('http://127.0.0.1:9003/api/control', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(msg)
                }).catch(() => {});
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
                // Ignore close errors
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
            if (event.channel.label === "control") {
                this.controlChannel = event.channel;
                
                this.controlChannel.onopen = () => {
                    // DataChannel opened
                };
                
                this.controlChannel.onclose = () => {
                    // DataChannel closed
                };
                
                this.controlChannel.onmessage = (ev) => {
                    // Control message received
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
                        }).catch(() => {
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
                        this.remoteVideo.play().catch(() => {});
                    }
                    
                    if (typeof setupInputHandlers === 'function') {
                        setupInputHandlers();
                    }
                };
                
                this.remoteVideo.onerror = () => {};
                
                if (typeof window !== 'undefined') {
                    window.isReceivingVideo = true;
                }
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
        
        // Track ICE candidates để kiểm tra P2P có hoạt động hay không
        let candidateCount = { host: 0, srflx: 0, relay: 0 };
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                const candidateStr = event.candidate.candidate;
                
                // Phân tích loại candidate
                if (candidateStr.includes("typ srflx")) {
                    candidateCount.srflx++;
                } else if (candidateStr.includes("typ relay")) {
                    candidateCount.relay++;
                } else if (candidateStr.includes("typ host")) {
                    candidateCount.host++;
                }
                
                const candidateMessage = {
                    type: "ice-candidate",
                    candidate: event.candidate
                };
                wsClient.sendWebRTCSignal(JSON.stringify(candidateMessage));
            } else {
                candidateCount = { host: 0, srflx: 0, relay: 0 }; // Reset cho lần sau
            }
        };
        
        // Xử lý trạng thái ICE connection
        this.peerConnection.oniceconnectionstatechange = () => {
            const iceState = this.peerConnection.iceConnectionState;
            
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
                    updateStatus("Lỗi xử lý offer: " + error.message);
                }
                
            } else if (message.type === "answer") {
                if (!this.peerConnection) {
                    updateStatus("Lỗi: Không có peer connection");
                    return;
                }
                
                if (!message.sdp) {
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
                    // Ignore candidate errors
                }
            }
            
        } catch (error) {
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
            } catch (e) {
                // Ignore send errors
            }
        }
    }
}

const rtcClient = new WebRTCClient();

function handleWebRTCSignal(signalData) {
    // signalData có thể là string hoặc object
    // Nếu là string, parse nó; nếu là object, dùng trực tiếp
    let parsedData = signalData;
    if (typeof signalData === 'string') {
        try {
            parsedData = JSON.parse(signalData);
        } catch (e) {
            return;
        }
    }
    
    rtcClient.handleSignal(parsedData);
}
