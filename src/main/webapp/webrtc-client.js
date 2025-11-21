/**
 * WebRTC Client để nhận video stream từ server
 */
class WebRTCClient {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteVideo = document.getElementById('remoteVideo');
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                // Thêm TURN server miễn phí để hỗ trợ 2 máy khác nhau
                // Lưu ý: TURN server miễn phí có thể không ổn định, chỉ dùng cho test
                { 
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                { 
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                { 
                    urls: 'turn:openrelay.metered.ca:80?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                { 
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ],
            iceCandidatePoolSize: 10
        };
    }
    
    /**
     * Bắt đầu chia sẻ màn hình
     */
    async startScreenShare() {
        try {
            // Cleanup trước khi bắt đầu mới
            this.stopScreenShare();
            
            updateStatus("Đang yêu cầu chia sẻ màn hình...");
            
            // Lấy stream màn hình từ browser
            this.localStream = await navigator.mediaDevices.getDisplayMedia({
                video: { 
                    cursor: "always",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            
            updateStatus("Đã bắt đầu chia sẻ màn hình");
            
            // Tạo PeerConnection mới
            this.createPeerConnection();
            
            // Thêm stream vào peer connection
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            // Xử lý ICE candidates - gửi qua WebSocket
            // Lưu ý: Handler này sẽ được set trong createPeerConnection, nhưng đảm bảo có handler
            // (Handler trong createPeerConnection sẽ ghi đè handler này nếu có)
            
            // Tạo offer
            console.log("Tạo WebRTC offer...");
            const offer = await this.peerConnection.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: false
            });
            await this.peerConnection.setLocalDescription(offer);
            console.log("Đã tạo và set local description (offer)");
            
            // Gửi offer qua WebSocket
            // Serialize SDP đúng cách - đảm bảo sdp là string
            const offerData = {
                type: offer.type,
                sdp: typeof offer.sdp === 'string' ? offer.sdp : String(offer.sdp)
            };
            const offerMessage = JSON.stringify(offerData);
            console.log("📤 Gửi offer đến peer qua WebSocket...");
            console.log("Offer type:", offerData.type);
            console.log("Offer SDP length:", offerData.sdp ? offerData.sdp.length : 0);
            wsClient.sendWebRTCSignal(offerMessage);
            
            // Ẩn placeholder khi bắt đầu chia sẻ
            const placeholder = document.getElementById('videoPlaceholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            // Xử lý khi stream kết thúc
            this.localStream.getVideoTracks()[0].onended = () => {
                this.stopScreenShare();
            };
            
        } catch (error) {
            console.error("Lỗi chia sẻ màn hình:", error);
            updateStatus("Lỗi: " + error.message);
        }
    }
    
    /**
     * Dừng chia sẻ màn hình
     */
    stopScreenShare() {
        console.log("🛑 Dừng chia sẻ màn hình...");
        
        // Stop local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
                console.log("✅ Đã stop track:", track.kind);
            });
            this.localStream = null;
        }
        
        // Cleanup peer connection
        this.cleanupPeerConnection();
        
        // Cleanup video element
        if (this.remoteVideo) {
            this.remoteVideo.srcObject = null;
            this.remoteVideo.style.display = 'none';
        }
        
        // Hiển thị lại placeholder
        const placeholder = document.getElementById('videoPlaceholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
        
        // Reset flag
        if (typeof window !== 'undefined') {
            window.isReceivingVideo = false;
        }
        
        updateStatus("Đã dừng chia sẻ màn hình");
    }
    
    /**
     * Cleanup peer connection cũ
     */
    cleanupPeerConnection() {
        if (this.peerConnection) {
            console.log("🧹 Cleanup peer connection cũ...");
            
            // Đóng tất cả tracks
            this.peerConnection.getReceivers().forEach(receiver => {
                if (receiver.track) {
                    receiver.track.stop();
                }
            });
            
            this.peerConnection.getSenders().forEach(sender => {
                if (sender.track) {
                    sender.track.stop();
                }
            });
            
            // Đóng connection
            try {
                this.peerConnection.close();
            } catch (error) {
                console.warn("Lỗi khi đóng peer connection:", error);
            }
            
            this.peerConnection = null;
        }
        
        // Cleanup video element
        if (this.remoteVideo) {
            this.remoteVideo.srcObject = null;
            // Reset tryPlayVideo method
            if (this.tryPlayVideo) {
                this.tryPlayVideo = null;
            }
        }
        
        // Reset flag
        if (typeof window !== 'undefined') {
            window.isReceivingVideo = false;
        }
    }
    
    /**
     * Tạo PeerConnection
     */
    createPeerConnection() {
        // Cleanup peer connection cũ trước khi tạo mới
        this.cleanupPeerConnection();
        
        console.log("🆕 Tạo peer connection mới...");
        this.peerConnection = new RTCPeerConnection(this.configuration);
        
        // Xử lý khi nhận remote stream
        this.peerConnection.ontrack = (event) => {
            console.log("✅ Nhận remote stream từ peer!", event);
            console.log("Event streams:", event.streams);
            console.log("Event track:", event.track);
            
            // Lấy stream từ event
            const stream = event.streams && event.streams.length > 0 
                ? event.streams[0] 
                : (event.track ? new MediaStream([event.track]) : null);
            
            if (this.remoteVideo && stream) {
                console.log("✅ Có stream, gán vào video element...");
                console.log("Stream tracks:", stream.getTracks().length);
                
                // Kiểm tra và enable tất cả video tracks
                stream.getTracks().forEach((track, index) => {
                    console.log(`Track ${index}:`, {
                        kind: track.kind,
                        enabled: track.enabled,
                        readyState: track.readyState,
                        muted: track.muted,
                        id: track.id,
                        label: track.label
                    });
                    
                    // Đảm bảo track được enable
                    if (!track.enabled) {
                        track.enabled = true;
                        console.log(`✅ Đã enable track ${index}`);
                    }
                });
                
                // Lấy video track
                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    console.log("✅ Video track details:", {
                        enabled: videoTrack.enabled,
                        readyState: videoTrack.readyState,
                        muted: videoTrack.muted,
                        settings: videoTrack.getSettings(),
                        capabilities: videoTrack.getCapabilities()
                    });
                    
                    // Đảm bảo track không bị muted
                    if (videoTrack.muted) {
                        console.warn("⚠️ Video track bị muted, thử unmute...");
                        // Không thể unmute trực tiếp, cần đợi track bắt đầu streaming
                    }
                    
                    // Monitor track state changes
                    videoTrack.onended = () => {
                        console.warn("⚠️ Video track ended");
                    };
                    
                    videoTrack.onmute = () => {
                        console.warn("⚠️ Video track muted - có thể chưa có dữ liệu");
                    };
                    
                    videoTrack.onunmute = () => {
                        console.log("✅ Video track unmuted - bắt đầu có dữ liệu");
                        // Khi track unmute, thử play ngay (force = true)
                        if (this.remoteVideo && this.remoteVideo.paused) {
                            console.log("🔄 Track unmuted, thử play ngay (force)...");
                            setTimeout(() => {
                                this.tryPlayVideo(true).then((success) => {
                                    if (!success) {
                                        // Nếu force play không thành công, thử lại sau
                                        console.log("⏳ Force play chưa thành công, thử lại sau...");
                                        setTimeout(() => {
                                            this.tryPlayVideo();
                                        }, 500);
                                    }
                                }).catch((error) => {
                                    console.error("❌ Lỗi khi force play:", error);
                                    // Thử lại sau
                                    setTimeout(() => {
                                        this.tryPlayVideo();
                                    }, 500);
                                });
                            }, 100);
                        }
                    };
                }
                
                // Đảm bảo video được hiển thị TRƯỚC khi gán stream
                // Xóa tất cả inline style có thể ẩn video
                this.remoteVideo.removeAttribute('style');
                this.remoteVideo.style.display = 'block';
                this.remoteVideo.style.visibility = 'visible';
                this.remoteVideo.style.opacity = '1';
                this.remoteVideo.style.width = '100%';
                this.remoteVideo.style.height = 'auto';
                this.remoteVideo.style.maxWidth = '100%';
                this.remoteVideo.style.maxHeight = '70vh';
                
                console.log("✅ Video element styles:", {
                    display: window.getComputedStyle(this.remoteVideo).display,
                    visibility: window.getComputedStyle(this.remoteVideo).visibility,
                    opacity: window.getComputedStyle(this.remoteVideo).opacity,
                    width: window.getComputedStyle(this.remoteVideo).width,
                    height: window.getComputedStyle(this.remoteVideo).height
                });
                
                // Ẩn placeholder TRƯỚC
                const placeholder = document.getElementById('videoPlaceholder');
                if (placeholder) {
                    placeholder.style.display = 'none';
                    console.log("✅ Đã ẩn placeholder");
                }
                
                // Gán stream vào video
                this.remoteVideo.srcObject = stream;
                console.log("✅ Đã gán stream vào video element");
                console.log("Video srcObject:", this.remoteVideo.srcObject);
                console.log("Video element:", this.remoteVideo);
                console.log("Video element computed style:", {
                    display: window.getComputedStyle(this.remoteVideo).display,
                    visibility: window.getComputedStyle(this.remoteVideo).visibility,
                    width: window.getComputedStyle(this.remoteVideo).width,
                    height: window.getComputedStyle(this.remoteVideo).height,
                    position: window.getComputedStyle(this.remoteVideo).position,
                    zIndex: window.getComputedStyle(this.remoteVideo).zIndex
                });
                
                // Kiểm tra stream active state
                console.log("Stream active:", stream.active);
                console.log("Stream id:", stream.id);
                
                // Lưu reference để có thể gọi từ các event handlers
                const self = this;
                
                // Hàm try play video (có thể gọi từ nhiều nơi)
                // Luôn trả về Promise để có thể dùng .then()
                this.tryPlayVideo = (force = false) => {
                    // Luôn trả về Promise
                    return Promise.resolve().then(() => {
                        if (!this.remoteVideo || !this.remoteVideo.srcObject) {
                            return false;
                        }
                        
                        // Kiểm tra ICE connection state (chỉ kiểm tra nếu không force)
                        if (!force && this.peerConnection) {
                            const iceState = this.peerConnection.iceConnectionState;
                            const connState = this.peerConnection.connectionState;
                            
                            // Nếu ICE state là "failed", không thử play
                            if (iceState === "failed") {
                                console.log(`❌ ICE connection failed, không thể play`);
                                return false;
                            }
                            
                            // Chỉ yêu cầu ICE connection nếu state vẫn là "new" và đã quá lâu
                            // Nếu state đã là "checking" hoặc "connected", có thể thử play
                            if (iceState === "new" && !force) {
                                // Kiểm tra xem có phải track đã unmuted không (có dữ liệu)
                                const videoTrack = this.remoteVideo.srcObject.getVideoTracks()[0];
                                if (videoTrack && videoTrack.muted) {
                                    console.log(`⏳ Đợi ICE connection và track data... (ICE: ${iceState}, track muted)`);
                                    return false;
                                }
                                // Nếu track đã unmuted (có dữ liệu), có thể thử play ngay
                                console.log(`ℹ️ ICE state: ${iceState}, nhưng track đã unmuted, thử play...`);
                            }
                        }
                        
                        // Kiểm tra xem metadata đã load chưa
                        // Nếu force hoặc track đã unmuted, có thể thử play ngay cả khi readyState < 2
                        if (!force && this.remoteVideo.readyState < 2) {
                            console.log(`⏳ Đợi metadata load... (readyState: ${this.remoteVideo.readyState})`);
                            return false;
                        }
                        
                        // Kiểm tra video dimensions
                        // Nếu force, thử play ngay cả khi dimensions = 0 (có thể sẽ có sau)
                        if (!force && (this.remoteVideo.videoWidth === 0 || this.remoteVideo.videoHeight === 0)) {
                            console.log(`⏳ Đợi video dimensions... (${this.remoteVideo.videoWidth}x${this.remoteVideo.videoHeight})`);
                            return false;
                        }
                        
                        // Đảm bảo video vẫn hiển thị trước khi play
                        this.remoteVideo.style.display = 'block';
                        this.remoteVideo.style.visibility = 'visible';
                        
                        console.log(`🔄 Thử play video (dimensions: ${this.remoteVideo.videoWidth}x${this.remoteVideo.videoHeight}, force: ${force})...`);
                        
                        // Thử play và đợi metadata/dimensions nếu cần
                        return this.remoteVideo.play().then(() => {
                            // Đợi một chút để video có dimensions
                            return new Promise((resolve) => {
                                const checkDimensions = () => {
                                    if (this.remoteVideo.videoWidth > 0 && this.remoteVideo.videoHeight > 0) {
                                        console.log("✅ Video đã bắt đầu play");
                                        console.log("Video dimensions:", this.remoteVideo.videoWidth, "x", this.remoteVideo.videoHeight);
                                        console.log("Video element dimensions:", this.remoteVideo.offsetWidth, "x", this.remoteVideo.offsetHeight);
                                        updateStatus("✅ Đã nhận và hiển thị video stream!");
                                        resolve(true);
                                    } else {
                                        // Nếu chưa có dimensions, đợi thêm
                                        setTimeout(checkDimensions, 100);
                                    }
                                };
                                
                                // Kiểm tra ngay
                                checkDimensions();
                                
                                // Timeout sau 3 giây
                                setTimeout(() => {
                                    if (this.remoteVideo.videoWidth === 0 || this.remoteVideo.videoHeight === 0) {
                                        console.warn("⚠️ Video đã play nhưng chưa có dimensions sau 3 giây");
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
                
                // Đợi metadata load TRƯỚC khi play
                let playAttempts = 0;
                const maxPlayAttempts = 40;
                let hasPlayed = false;
                
                const tryPlay = () => {
                    if (hasPlayed) {
                        return; // Đã play thành công, dừng retry
                    }
                    
                    if (playAttempts >= maxPlayAttempts) {
                        console.error("❌ Đã thử play quá nhiều lần, dừng lại");
                        console.error("Video state:", {
                            videoWidth: this.remoteVideo.videoWidth,
                            videoHeight: this.remoteVideo.videoHeight,
                            readyState: this.remoteVideo.readyState,
                            paused: this.remoteVideo.paused,
                            srcObject: !!this.remoteVideo.srcObject,
                            streamActive: this.remoteVideo.srcObject?.active,
                            iceConnectionState: this.peerConnection?.iceConnectionState,
                            connectionState: this.peerConnection?.connectionState,
                            trackMuted: this.remoteVideo.srcObject?.getVideoTracks()[0]?.muted
                        });
                        
                        // Nếu đã quá nhiều lần, thử force play lần cuối
                        console.log("🔄 Thử force play lần cuối...");
                        this.tryPlayVideo(true).then((success) => {
                            if (success) {
                                hasPlayed = true;
                            }
                        });
                        return;
                    }
                    
                    playAttempts++;
                    this.tryPlayVideo().then((success) => {
                        if (success) {
                            hasPlayed = true;
                        } else if (this.remoteVideo && this.remoteVideo.paused) {
                            // Nếu chưa play được, thử lại sau
                            setTimeout(tryPlay, 300);
                        }
                    });
                };
                
                // Bắt đầu thử play sau khi gán stream
                setTimeout(tryPlay, 100);
                
                // Event handlers cho video
                this.remoteVideo.onloadedmetadata = () => {
                    console.log("✅ Video metadata loaded");
                    console.log("Video dimensions:", this.remoteVideo.videoWidth, "x", this.remoteVideo.videoHeight);
                    console.log("Video element dimensions:", this.remoteVideo.offsetWidth, "x", this.remoteVideo.offsetHeight);
                    console.log("Video readyState:", this.remoteVideo.readyState);
                    console.log("Video paused:", this.remoteVideo.paused);
                    console.log("Video currentTime:", this.remoteVideo.currentTime);
                    
                    // Đảm bảo video vẫn hiển thị
                    this.remoteVideo.style.display = 'block';
                    this.remoteVideo.style.visibility = 'visible';
                    
                    // Thử play nếu chưa play và có dimensions
                    if (this.remoteVideo.paused && this.remoteVideo.videoWidth > 0 && this.remoteVideo.videoHeight > 0) {
                        this.remoteVideo.play().then(() => {
                            console.log("✅ Video đã play sau khi metadata loaded");
                        }).catch((error) => {
                            console.error("❌ Lỗi play sau metadata loaded:", error);
                        });
                    }
                    
                    // Setup input handlers
                    if (typeof setupInputHandlers === 'function') {
                        setupInputHandlers();
                        console.log("✅ Đã setup input handlers");
                    }
                };
                
                this.remoteVideo.onplay = () => {
                    console.log("✅ Video đang play");
                    console.log("Video dimensions khi play:", this.remoteVideo.videoWidth, "x", this.remoteVideo.videoHeight);
                    console.log("Video element dimensions khi play:", this.remoteVideo.offsetWidth, "x", this.remoteVideo.offsetHeight);
                    
                    // Kiểm tra lại style
                    const computedStyle = window.getComputedStyle(this.remoteVideo);
                    console.log("Computed style khi play:", {
                        display: computedStyle.display,
                        visibility: computedStyle.visibility,
                        width: computedStyle.width,
                        height: computedStyle.height,
                        opacity: computedStyle.opacity
                    });
                };
                
                this.remoteVideo.onloadeddata = () => {
                    console.log("✅ Video data loaded");
                    console.log("Video dimensions:", this.remoteVideo.videoWidth, "x", this.remoteVideo.videoHeight);
                    console.log("Video readyState:", this.remoteVideo.readyState);
                    
                    // Thử play nếu chưa play và có dimensions
                    if (this.remoteVideo.paused && this.remoteVideo.videoWidth > 0 && this.remoteVideo.videoHeight > 0) {
                        this.remoteVideo.play().then(() => {
                            console.log("✅ Video đã play sau khi data loaded");
                        }).catch((error) => {
                            console.error("❌ Lỗi play sau data loaded:", error);
                        });
                    }
                };
                
                this.remoteVideo.oncanplay = () => {
                    console.log("✅ Video can play");
                    console.log("Video dimensions:", this.remoteVideo.videoWidth, "x", this.remoteVideo.videoHeight);
                    console.log("Video readyState:", this.remoteVideo.readyState);
                    
                    // Thử play nếu chưa play và có dimensions
                    if (this.remoteVideo.paused && this.remoteVideo.videoWidth > 0 && this.remoteVideo.videoHeight > 0) {
                        this.remoteVideo.play().then(() => {
                            console.log("✅ Video đã play sau khi can play");
                        }).catch((error) => {
                            console.error("❌ Lỗi play sau can play:", error);
                        });
                    }
                };
                
                this.remoteVideo.oncanplaythrough = () => {
                    console.log("✅ Video can play through");
                    console.log("Video dimensions:", this.remoteVideo.videoWidth, "x", this.remoteVideo.videoHeight);
                };
                
                this.remoteVideo.onerror = (error) => {
                    console.error("❌ Video error:", error);
                    console.error("Video error details:", this.remoteVideo.error);
                };
                
                // Đánh dấu đang nhận video
                if (typeof window !== 'undefined') {
                    window.isReceivingVideo = true;
                    console.log("✅ Đã đánh dấu isReceivingVideo = true");
                }
                
                console.log("✅ Video stream đã được gán và hiển thị!");
            } else {
                console.error("❌ Không có stream hoặc video element!");
                console.error("remoteVideo:", this.remoteVideo);
                console.error("stream:", stream);
            }
        };
        
        // Xử lý ICE candidates (khi đang chia sẻ màn hình)
        // Lưu ý: Handler này sẽ bị ghi đè bởi handler trong createPeerConnection
        // Nhưng để đảm bảo, chúng ta sẽ gửi ở cả 2 nơi hoặc chỉ ở createPeerConnection
        
        // Xử lý connection state
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log("WebRTC Connection state:", state);
            updateStatus("WebRTC: " + state);
            
            if (state === "connected") {
                console.log("✅ WebRTC đã kết nối thành công!");
                updateStatus("✅ WebRTC: Đã kết nối với peer");
                
                // Khi connection thành công, thử play video
                if (this.remoteVideo && this.remoteVideo.srcObject) {
                    console.log("🔄 WebRTC connection thành công, thử play video...");
                    setTimeout(() => {
                        if (typeof this.tryPlayVideo === 'function') {
                            this.tryPlayVideo();
                        }
                    }, 200);
                }
            } else if (state === "failed" || state === "disconnected") {
                console.warn("⚠️ WebRTC connection:", state);
                updateStatus("⚠️ WebRTC: " + state);
            }
        };
        
        // Xử lý ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            const iceState = this.peerConnection.iceConnectionState;
            console.log("ICE Connection state:", iceState);
            if (iceState === "connected" || iceState === "completed") {
                console.log("✅ ICE connection thành công!");
                updateStatus("✅ WebRTC: Đã kết nối");
                
                // Khi ICE connection thành công, thử play video
                if (this.remoteVideo && this.remoteVideo.srcObject) {
                    console.log("🔄 ICE connection thành công, thử play video...");
                    setTimeout(() => {
                        if (typeof this.tryPlayVideo === 'function') {
                            this.tryPlayVideo();
                        }
                    }, 200);
                }
            } else if (iceState === "failed") {
                console.error("❌ ICE connection failed!");
                console.error("⚠️ Có thể do NAT/Firewall. Thử:");
                console.error("   1. Kiểm tra firewall trên cả 2 máy");
                console.error("   2. Đảm bảo cả 2 máy trong cùng mạng LAN");
                console.error("   3. Cần TURN server cho mạng phức tạp");
                updateStatus("❌ ICE connection failed - Xem console để biết thêm");
            } else if (iceState === "disconnected") {
                console.warn("⚠️ ICE connection disconnected");
                updateStatus("⚠️ WebRTC: Đã ngắt kết nối");
            }
        };
        
        // Xử lý ICE gathering state
        this.peerConnection.onicegatheringstatechange = () => {
            const gatheringState = this.peerConnection.iceGatheringState;
            console.log("ICE Gathering state:", gatheringState);
            if (gatheringState === "complete") {
                console.log("✅ ICE gathering hoàn tất");
                
                // Sau khi ICE gathering hoàn tất, thử play video
                if (this.remoteVideo && this.remoteVideo.srcObject) {
                    console.log("🔄 ICE gathering hoàn tất, thử play video...");
                    setTimeout(() => {
                        if (typeof this.tryPlayVideo === 'function') {
                            this.tryPlayVideo();
                        }
                    }, 300);
                }
            }
        };
        
        // Gửi ICE candidates qua WebSocket
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("📡 ICE candidate:", event.candidate.candidate);
                console.log("   Type:", event.candidate.type);
                console.log("   Protocol:", event.candidate.protocol);
                
                // Gửi ICE candidate qua WebSocket
                const candidateMessage = {
                    type: "ice-candidate",
                    candidate: {
                        candidate: event.candidate.candidate,
                        sdpMLineIndex: event.candidate.sdpMLineIndex,
                        sdpMid: event.candidate.sdpMid
                    }
                };
                
                console.log("📤 Gửi ICE candidate qua WebSocket:", candidateMessage);
                wsClient.sendWebRTCSignal(JSON.stringify(candidateMessage));
            } else {
                console.log("✅ ICE gathering hoàn tất (null candidate)");
            }
        };
    }
    
    /**
     * Xử lý WebRTC signaling message
     */
    async handleSignal(signal) {
        try {
            console.log("handleSignal nhận signal:", signal);
            console.log("Type của signal:", typeof signal);
            
            // Nếu signal đã là object, dùng trực tiếp; nếu là string, parse
            let message;
            if (typeof signal === 'string') {
                message = JSON.parse(signal);
            } else {
                message = signal;
            }
            
            console.log("Parsed message:", message);
            console.log("Message type:", message.type);
            console.log("Message.sdp type:", typeof message.sdp);
            console.log("Message.sdp value (first 100 chars):", message.sdp ? String(message.sdp).substring(0, 100) : "null");
            
            if (message.type === "offer") {
                console.log("📥 Nhận offer từ peer, tạo answer...");
                
                // Kiểm tra SDP có đúng format không
                if (!message.sdp) {
                    console.error("❌ Offer không có SDP!");
                    updateStatus("Lỗi: Offer không có SDP");
                    return;
                }
                
                // Đảm bảo sdp là string
                let sdpString = message.sdp;
                if (typeof sdpString !== 'string') {
                    console.warn("⚠️ SDP không phải string, type:", typeof sdpString);
                    console.warn("⚠️ SDP value:", sdpString);
                    // Nếu là object, thử lấy sdp property
                    if (typeof sdpString === 'object' && sdpString.sdp) {
                        sdpString = sdpString.sdp;
                    } else {
                        sdpString = String(sdpString);
                    }
                }
                
                // Kiểm tra SDP có đúng format (bắt đầu bằng v=)
                if (!sdpString.startsWith('v=')) {
                    console.error("❌ SDP không đúng format!");
                    console.error("❌ SDP (first 200 chars):", sdpString.substring(0, 200));
                    console.error("❌ SDP type:", typeof sdpString);
                    updateStatus("Lỗi: SDP không đúng format");
                    return;
                }
                
                console.log("✅ SDP format OK, length:", sdpString.length);
                
                if (!this.peerConnection) {
                    console.log("Tạo peer connection mới...");
                    this.createPeerConnection();
                }
                
                try {
                    // Tạo RTCSessionDescription từ message - đảm bảo sdp là string
                    const offerDesc = new RTCSessionDescription({
                        type: message.type,
                        sdp: sdpString
                    });
                    
                    await this.peerConnection.setRemoteDescription(offerDesc);
                    console.log("✅ Đã set remote description (offer)");
                    
                    const answer = await this.peerConnection.createAnswer({
                        offerToReceiveVideo: true,
                        offerToReceiveAudio: false
                    });
                    await this.peerConnection.setLocalDescription(answer);
                    console.log("✅ Đã tạo và set local description (answer)");
                    
                    // Serialize answer đúng cách - đảm bảo sdp là string
                    const answerData = {
                        type: answer.type,
                        sdp: typeof answer.sdp === 'string' ? answer.sdp : String(answer.sdp)
                    };
                    wsClient.sendWebRTCSignal(JSON.stringify(answerData));
                    console.log("📤 Đã gửi answer đến peer");
                    console.log("Answer type:", answerData.type);
                    console.log("Answer SDP length:", answerData.sdp ? answerData.sdp.length : 0);
                } catch (error) {
                    console.error("❌ Lỗi xử lý offer:", error);
                    console.error("Error details:", error.stack);
                    updateStatus("Lỗi xử lý offer: " + error.message);
                }
                
            } else if (message.type === "answer") {
                console.log("📥 Nhận answer từ peer");
                console.log("Answer message:", message);
                
                if (!this.peerConnection) {
                    console.error("❌ Không có peer connection khi nhận answer!");
                    updateStatus("Lỗi: Không có peer connection");
                    return;
                }
                
                // Kiểm tra SDP có đúng format không
                if (!message.sdp) {
                    console.error("❌ Answer không có SDP!");
                    updateStatus("Lỗi: Answer không có SDP");
                    return;
                }
                
                // Đảm bảo sdp là string
                let sdpString = message.sdp;
                if (typeof sdpString !== 'string') {
                    console.warn("⚠️ SDP không phải string, type:", typeof sdpString);
                    console.warn("⚠️ SDP value:", sdpString);
                    // Nếu là object, thử lấy sdp property
                    if (typeof sdpString === 'object' && sdpString.sdp) {
                        sdpString = sdpString.sdp;
                    } else {
                        sdpString = String(sdpString);
                    }
                }
                
                // Kiểm tra SDP có đúng format (bắt đầu bằng v=)
                if (!sdpString.startsWith('v=')) {
                    console.error("❌ SDP không đúng format!");
                    console.error("❌ SDP (first 200 chars):", sdpString.substring(0, 200));
                    console.error("❌ SDP type:", typeof sdpString);
                    updateStatus("Lỗi: SDP không đúng format");
                    return;
                }
                
                console.log("✅ SDP format OK, length:", sdpString.length);
                
                try {
                    // Tạo RTCSessionDescription từ message - đảm bảo sdp là string
                    const answerDesc = new RTCSessionDescription({
                        type: message.type,
                        sdp: sdpString
                    });
                    
                    await this.peerConnection.setRemoteDescription(answerDesc);
                    console.log("✅ Đã set remote description (answer)");
                } catch (error) {
                    console.error("❌ Lỗi set remote description (answer):", error);
                    console.error("Error details:", error.stack);
                    updateStatus("Lỗi set answer: " + error.message);
                }
                
            } else if (message.type === "ice-candidate") {
                console.log("📥 Nhận ICE candidate từ peer");
                console.log("Candidate message:", message);
                
                if (!this.peerConnection) {
                    console.warn("⚠️ Không có peer connection khi nhận ICE candidate, bỏ qua");
                    return;
                }
                
                if (!message.candidate) {
                    console.log("ICE candidate null (end of candidates)");
                    return;
                }
                
                try {
                    // Tạo RTCIceCandidate từ message
                    // message.candidate có thể là object với candidate, sdpMLineIndex, sdpMid
                    const candidateData = message.candidate;
                    const iceCandidate = new RTCIceCandidate({
                        candidate: candidateData.candidate || candidateData,
                        sdpMLineIndex: candidateData.sdpMLineIndex !== undefined ? candidateData.sdpMLineIndex : null,
                        sdpMid: candidateData.sdpMid || null
                    });
                    
                    await this.peerConnection.addIceCandidate(iceCandidate);
                    console.log("✅ Đã thêm ICE candidate:", candidateData.candidate || candidateData);
                } catch (error) {
                    console.error("❌ Lỗi thêm ICE candidate:", error);
                    console.error("Candidate data:", message.candidate);
                    // Không cần throw, có thể bỏ qua một số candidate
                }
            } else {
                console.warn("⚠️ Loại signal không xác định:", message.type);
            }
            
        } catch (error) {
            console.error("Lỗi xử lý signal:", error);
            updateStatus("Lỗi WebRTC: " + error.message);
        }
    }
}

// Tạo instance global
const rtcClient = new WebRTCClient();

// Hàm để xử lý WebRTC signal từ WebSocket
function handleWebRTCSignal(signalData) {
    console.log("handleWebRTCSignal nhận:", signalData);
    console.log("Type của signalData:", typeof signalData);
    rtcClient.handleSignal(signalData);
}

