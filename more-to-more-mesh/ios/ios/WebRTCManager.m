//
//  WebRTCManager.m
//  ios
//
//  Created by 连爱朋 on 2019/12/14.
//  Copyright © 2019 demo. All rights reserved.
//

#import "WebRTCManager.h"

#import <CoreGraphics/CoreGraphics.h>
#import <CoreVideo/CoreVideo.h>
#import <CoreMedia/CoreMedia.h>

//#import <WebRTC/WebRTC.h>
#import "WebRTC.framework/Headers/WebRTC.h"
#import "WebSocketManager.h"


@interface WebRTCManager() <RTCPeerConnectionDelegate>

@property (nonatomic, strong) RTCPeerConnectionFactory *factory;
@property (nonatomic, strong) RTCMediaStream *localStream;
@property (nonatomic, strong) RTCPeerConnection *peerConnection;
//@property (nonatomic, strong) RTCAudioTrack *audioTrack;

//@property (nonatomic, strong) RTCVideoTrack *videoTrack;  // 可屏蔽
//@property (nonatomic, strong) RTCVideoSource *videoSource;
@property (nonatomic, strong) RTCCameraVideoCapturer *capturer;

@end


@implementation WebRTCManager

+(instancetype) shared {
    static WebRTCManager *_instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        _instance = [[self alloc] init];
    });
    return _instance;
}
-(instancetype)init{
    self = [super init];
    if (!self) {
        return nil;
    }
    //[self _setup];
    return self;
}

-(void)doLogin:(NSString *)messageType LoginUser:(NSString *)userName {
    NSLog(@"WebRTCManager doLogin messageType:%@ loginUser:%@", messageType, userName);
    _localUser = userName;
    
    NSMutableDictionary *dict = @{
        @"messageType": @"login",
        @"userName": userName};
    //NSMutableDictionary *dict = @{@"messageType": @"login",@"userName": userName,@"wocao": @{}};

    [self sendDataWithDictionary:dict];
}

-(void)doCall:(NSString *)userName {
    NSLog(@"WebRTCManager doCall remoteUser:%@", userName);
    _remoteUser = userName;
    _peerConnection = [self createPeerConnection];
    
//    if (_peerConnection.signalingState == RTCSignalingStateHaveLocalOffer) {
//        NSLog(@"WebRTCManager doCall RTCSignalingStateHaveLocalOffer");
//    } else if (_peerConnection.signalingState == RTCSignalingStateHaveRemoteOffer) {
//        NSLog(@"WebRTCManager doCall RTCSignalingStateHaveRemoteOffer");
//    } else if (_peerConnection.signalingState == RTCSignalingStateStable) {
//        NSLog(@"WebRTCManager doCall RTCSignalingStateStable");
//    } else {
//        NSLog(@"WebRTCManager doCall %@", _peerConnection.signalingState);
//    }
    
    NSDictionary *mandatory = @{kRTCMediaConstraintsOfferToReceiveAudio : kRTCMediaConstraintsValueTrue,
                                kRTCMediaConstraintsOfferToReceiveVideo : kRTCMediaConstraintsValueTrue};
    RTCMediaConstraints *constraints = [[RTCMediaConstraints alloc] initWithMandatoryConstraints:mandatory optionalConstraints:nil];
    
    //__weak __typeof(_peerConnection) tconnection = _peerConnection;
    [_peerConnection offerForConstraints:constraints completionHandler:^(RTCSessionDescription * _Nullable sdp, NSError * _Nullable error) {
        if (error) {
            NSLog(@"WebRTCManager doCall error:%@", error);
            return ;
        }
        
        if (sdp.type == RTCSdpTypeOffer) {
            __weak __typeof(_peerConnection) tconnection = _peerConnection;
            [tconnection setLocalDescription:sdp completionHandler:^(NSError * _Nullable error) {
                if (error) {
                    NSLog(@"WebRTCManager doCall error:%@", error);
                    return ;
                }

                NSMutableDictionary *dict = @{@"messageType":@"offer",
                    @"toUser": userName,
                    @"fromUser":_localUser,
                    @"offer": @{
                            @"type": @"offer",
                            @"sdp":tconnection.localDescription.sdp}
                };
                
                [self sendDataWithDictionary:dict];
            }];
        } else {
            NSLog(@"WebRTCManager doCall 11111111111111111111113");
        }
    }];
    NSLog(@"WebRTCManager doCall END remoteUser:%@", userName);
}

-(void)sendDataWithDictionary:(NSMutableDictionary *)dict {
    NSLog(@"WebRTCManager sendDataWithDictionary:%@", dict);
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:dict options:NSJSONWritingPrettyPrinted error:&error];
    NSString *jsonStr = nil;
    if (!jsonData) {
        NSLog(@"WebRTCManager sendDataWithDictionary ERROR:%@",error);
    } else {
        jsonStr = [[NSString alloc]initWithData:jsonData encoding:NSUTF8StringEncoding];
        NSLog(@"WebRTCManager sendDataWithDictionary JSON:%@", jsonStr);
    }
    [[WebSocketManager shared] sendData:jsonStr];
}

-(void)recvDataWithString:(NSString *)message {
    NSLog(@"WebRTCManager recvDataWithString message:%@", message);
    if (message == nil) {
        return;
    }
    
    NSData *jsonData = [message dataUsingEncoding:NSUTF8StringEncoding];
    NSError *error;
    NSMutableDictionary *dict = [NSJSONSerialization JSONObjectWithData:jsonData options:NSJSONReadingMutableContainers error:&error];
    if (error) {
        NSLog(@"WebRTCManager recvDataWithString error:%@",error);
    } else {
        NSString *messageType = dict[@"messageType"];
        if ([messageType isEqualToString:@"login"]) {
            [self setupLocalStream];
        } else if ([messageType isEqualToString:@"offer"]) {
            [self recvOffer:dict];
        } else if ([messageType isEqualToString:@"answer"]) {
            [self recvAnswer:dict];
        } else if ([messageType isEqualToString:@"candidate"]) {
            [self recvCandidate:dict];
        } else {
            NSLog(@"WebRTCManager recvDataWithString messageType undefined");
        }
        NSLog(@"WebRTCManager recvDataWithString messageType:%@", messageType);
    }
}

-(void)setupFactory{
    RTCDefaultVideoEncoderFactory *encoderFactory = [[RTCDefaultVideoEncoderFactory alloc] init];
    RTCDefaultVideoDecoderFactory *decoderFactory = [[RTCDefaultVideoDecoderFactory alloc] init];
    NSArray *codecs = [encoderFactory supportedCodecs];
    [encoderFactory setPreferredCodec:codecs[2]];
    //    //RTCPeerConnectionFactory *factory = [[RTCPeerConnectionFactory alloc] init];
    //    //_factory = [[RTCPeerConnectionFactory alloc] init];
    //    _factory = [[RTCPeerConnectionFactory alloc] init];
    _factory = [[RTCPeerConnectionFactory alloc] initWithEncoderFactory:encoderFactory decoderFactory:decoderFactory];
}

-(void)setupLocalStream{
    NSLog(@"WebRTCManager setupLocalStream");
    if (!_localStream) {
        [self setupFactory];
        
        // 创建本地流
        _localStream = [_factory mediaStreamWithStreamId:@"ARDAMS"];
        
        // 添加音频轨
        RTCAudioTrack *audioTrack = [_factory audioTrackWithTrackId:@"ARDAMSa0"];
        [_localStream addAudioTrack:audioTrack];
        
        // 添加视频轨
        RTCVideoSource *videoSource = [_factory videoSource];
        [videoSource adaptOutputFormatToWidth:150 height:200 fps:30];
        // videoSource 绑定音轨
        RTCVideoTrack *videoTrack = [_factory videoTrackWithSource:videoSource trackId:@"ARDAMSv0"];
        [_localStream addVideoTrack:videoTrack];
        
        // 摄像头权限 要和 videoSource绑定
        AVAuthorizationStatus authStatus = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
        NSArray<AVCaptureDevice *> *devices;
        if (authStatus == AVAuthorizationStatusRestricted || authStatus == AVAuthorizationStatusDenied) {
            NSLog(@"WebRTCManager setupLocalStream no camera auth");
            
            if ([_delegate respondsToSelector:@selector(webRTCManager:setLocalCapturer:)]){
                [_delegate webRTCManager:self setLocalCapturer:nil];
            }
        } else {
            devices = [RTCCameraVideoCapturer captureDevices];
            //AVCaptureDevice *device = [devices lastObject];
            AVCaptureDevice *device = devices[0];
            
            if (device) {
                // 绑定设备与videoSource
                _capturer = [[RTCCameraVideoCapturer alloc] initWithDelegate:videoSource];
                AVCaptureDeviceFormat *format = [[RTCCameraVideoCapturer supportedFormatsForDevice:device] lastObject];
                CGFloat fps = [[format videoSupportedFrameRateRanges] firstObject].maxFrameRate;
                [_capturer startCaptureWithDevice:device format:format fps:fps];
   
//#if defined(1)
                if ([_delegate respondsToSelector:@selector(webRTCManager:setLocalCapturer:)]){
                    [_delegate webRTCManager:self setLocalCapturer:_capturer];
                }
//#else
//                if ([_delegate respondsToSelector:@selector(webRTCManager:setLocalStream:)]){
//                    [_delegate webRTCManager:self setLocalStream:_localStream];
//                }
//#endif
            } else {
                NSLog(@"WebRTCManager setupLocalStream no device");
                if ([_delegate respondsToSelector:@selector(webRTCManager:setLocalCapturer:)]){
                    [_delegate webRTCManager:self setLocalCapturer:nil];
                }
            }
        }
    } else {
        NSLog(@"WebRTCManager setupLocalStream no localStream");
    }
}

-(RTCPeerConnection *)createPeerConnection {
    NSLog(@"WebRTCManager setupIceServers");
    RTCIceServer *iceServer1 = [[RTCIceServer alloc] initWithURLStrings:@[@"stun:stun.l.google.com:19302"] username:@"" credential:@""];
    //RTCIceServer *iceServer2 = [[RTCIceServer alloc] initWithURLStrings:@[stunUrl] username:@"" credential:@""];
    
    NSMutableArray <RTCIceServer *> *iceServers = [NSMutableArray array];
    [iceServers addObject:iceServer1];
    
    RTCConfiguration *configuration = [[RTCConfiguration alloc] init];
    [configuration setIceServers:iceServers];
    
    NSDictionary *mandatory = @{kRTCMediaConstraintsOfferToReceiveAudio : kRTCMediaConstraintsValueTrue,
                                kRTCMediaConstraintsOfferToReceiveVideo : kRTCMediaConstraintsValueTrue,
                                };
    RTCMediaConstraints *constraints = [[RTCMediaConstraints alloc] initWithMandatoryConstraints:mandatory optionalConstraints:nil];
    
    RTCPeerConnection *connection = [_factory peerConnectionWithConfiguration:configuration constraints:constraints delegate:self];
    // 添加本地流
    [connection addStream:_localStream];

    NSLog(@"WebRTCManager createPeerConnection");
    return connection;
}

-(void)recvOffer:(NSMutableDictionary *) dict{
    NSLog(@"WebRTCManager recvOffer %@", dict);
    NSDictionary *offerDic = dict[@"offer"];
    NSString *sdp = offerDic[@"sdp"];
    NSString *type = offerDic[@"type"];
    NSString *fromUser = dict[@"fromUser"];
    NSString *toUser = dict[@"toUser"];
    
    _remoteUser = fromUser;
    _peerConnection = [self createPeerConnection];
    
    RTCSessionDescription *remoteSdp = [[RTCSessionDescription alloc] initWithType:RTCSdpTypeOffer sdp:sdp];
    __weak __typeof(_peerConnection) tconnection = _peerConnection;
    [tconnection setRemoteDescription:remoteSdp completionHandler:^(NSError * _Nullable error) {
        if (error) {
            NSLog(@"WebRTCManager recvOffer Error:%@", error);
            return ;
        }
        
        [self doAnswer];
    }];
}

-(void)doAnswer {
    NSLog(@"WebRTCManager doAnswer");
    NSDictionary *mandatory = @{kRTCMediaConstraintsOfferToReceiveAudio : kRTCMediaConstraintsValueTrue,
                                kRTCMediaConstraintsOfferToReceiveVideo : kRTCMediaConstraintsValueTrue};
    RTCMediaConstraints *constraints = [[RTCMediaConstraints alloc] initWithMandatoryConstraints:mandatory optionalConstraints:nil];
    __weak __typeof(_peerConnection) tconnection = _peerConnection;
    [tconnection answerForConstraints:constraints completionHandler:^(RTCSessionDescription * _Nullable sdp, NSError * _Nullable error) {
        if (error) {
            NSLog(@"WebRTCManager doAnswer Error:%@", error);
            return ;
        }
        
        if (sdp.type == RTCSdpTypeAnswer) {
            [tconnection setLocalDescription:sdp completionHandler:^(NSError * _Nullable error) {
                if (error) {
                    NSLog(@"WebRTCManager doAnswer Error:%@", error);
                    return ;
                }
                
                NSMutableDictionary *dict = @{
                    @"messageType": @"answer",
                    @"fromUser": _localUser,
                    @"toUser": _remoteUser,
                    @"answer": @{
                            @"type": @"answer",
                            @"sdp": tconnection.localDescription.sdp}
                };
                
                [self sendDataWithDictionary:dict];
            }];
        } else {
            NSLog(@"WebRTCManager doAnswer sdp.type is not RTCSdpTypeAnswer");
        }
    }];
}

-(void)recvAnswer:(NSMutableDictionary *) dict {
    NSLog(@"WebRTCManager recvAnswer %@", dict);
    NSDictionary *answerDic = dict[@"answer"];
    NSString *sdp = answerDic[@"sdp"];
    NSString *type = answerDic[@"type"];
    NSString *fromUser = dict[@"fromUser"];
    NSString *toUser = dict[@"toUser"];
    
    RTCSessionDescription *remoteSdp = [[RTCSessionDescription alloc] initWithType:RTCSdpTypeAnswer sdp:sdp];
    __weak __typeof(_peerConnection) tconnection = _peerConnection;
    [tconnection setRemoteDescription:remoteSdp completionHandler:^(NSError * _Nullable error) {
        if (error) {
            NSLog(@"WebRTCManager recvAnswer error:%@", error);
            return ;
        }
    }];
}

-(void)recvCandidate:(NSMutableDictionary *) dict {
    NSLog(@"WebRTCManager recvCandidate");
    NSDictionary *candidateDic = dict[@"candidate"];
    NSString *sdpMid = candidateDic[@"sdpMid"];
    NSInteger sdpMLineIndex = [candidateDic[@"sdpMLineIndex"] integerValue];
    NSString *candidate = candidateDic[@"candidate"];
    NSString *fromUser = dict[@"fromUser"];
    NSString *toUser = dict[@"toUser"];

    // 生成远端网络地址对象
    RTCIceCandidate *iceCandidate = [[RTCIceCandidate alloc] initWithSdp:candidate sdpMLineIndex:(int)sdpMLineIndex sdpMid:sdpMid];
    // 添加到点对点连接中
    [_peerConnection addIceCandidate:iceCandidate];
}


/** Called when the SignalingState changed. */
- (void)peerConnection:(RTCPeerConnection *)peerConnection didChangeSignalingState:(RTCSignalingState)stateChanged {
    NSLog(@"WebRTCManager didChangeSignalingState");

}

/** Called when media is received on a new stream from remote peer. */
- (void)peerConnection:(RTCPeerConnection *)peerConnection didAddStream:(RTCMediaStream *)stream {
    NSLog(@"WebRTCManager didAddStream ##### ##### ##### ##### ##### ##### ##### ##### %@", stream);

    if ([_delegate respondsToSelector:@selector(webRTCManager:addRemoteStream:)]){
        NSLog(@"WebRTCManager didAddStream ##### ##### ##### ##### ##### ##### ##### ##### 1");
        [_delegate webRTCManager:self addRemoteStream:stream];
        NSLog(@"WebRTCManager didAddStream ##### ##### ##### ##### ##### ##### ##### ##### 2");
    } else {
        NSLog(@"WebRTCManager didAddStream ##### ##### ##### ##### ##### ##### ##### ##### error");
    }
}

/** Called when a remote peer closes a stream.
 *  This is not called when RTCSdpSemanticsUnifiedPlan is specified.
 */
- (void)peerConnection:(RTCPeerConnection *)peerConnection didRemoveStream:(RTCMediaStream *)stream {
    NSLog(@"WebRTCManager didRemoveStream");

}

/** Called when negotiation is needed, for example ICE has restarted. */
- (void)peerConnectionShouldNegotiate:(RTCPeerConnection *)peerConnection {
    NSLog(@"WebRTCManager peerConnection");

}

/** Called any time the IceConnectionState changes. */
- (void)peerConnection:(RTCPeerConnection *)peerConnection didChangeIceConnectionState:(RTCIceConnectionState)newState {
    NSLog(@"WebRTCManager didChangeIceConnectionState");
}

/** Called any time the IceGatheringState changes. */
//当ICE连接状态发生变化时会触发该方法
- (void)peerConnection:(RTCPeerConnection *)peerConnection didChangeIceGatheringState:(RTCIceGatheringState)newState {
    NSLog(@"WebRTCManager didChangeIceGatheringState");
}

/** New ice candidate has been found. */
//该方法用于收集可用的Candidate
- (void)peerConnection:(RTCPeerConnection *)peerConnection didGenerateIceCandidate:(RTCIceCandidate *)candidate {
    NSLog(@"WebRTCManager didGenerateIceCandidate");
    
    NSMutableDictionary *dict = @{
        @"messageType": @"candidate",
        @"fromUser": _localUser,
        @"toUser": _remoteUser,
        @"candidate": @{
                @"sdpMid" : candidate.sdpMid,
                @"sdpMLineIndex" : [NSNumber numberWithInteger:candidate.sdpMLineIndex],
                @"candidate" : candidate.sdp}
    };
    
    [[WebRTCManager shared] sendDataWithDictionary:dict];
}

/** Called when a group of local Ice candidates have been removed. */
- (void)peerConnection:(RTCPeerConnection *)peerConnection didRemoveIceCandidates:(NSArray<RTCIceCandidate *> *)candidates {
    NSLog(@"WebRTCManager didRemoveIceCandidates");

}

/** New data channel has been opened. */
- (void)peerConnection:(RTCPeerConnection *)peerConnection didOpenDataChannel:(RTCDataChannel *)dataChannel {
    NSLog(@"WebRTCManager didOpenDataChannel");
}

-(void)peerConnection:(RTCPeerConnection *)peerConnection didAddReceiver:(nonnull RTCRtpReceiver *)rtpReceiver streams:(nonnull NSArray<RTCMediaStream *> *)mediaStreams {
    NSLog(@"WebRTCManager didAddReceiver ##### ##### ##### ##### ##### ##### ##### ##### 0");

//    if ([_delegate respondsToSelector:@selector(webRTCManager:addRemoteReceiver:)]){
//        NSLog(@"WebRTCManager didAddReceiver ##### ##### ##### ##### ##### ##### ##### ##### 1");
//        [_delegate webRTCManager:self addRemoteReceiver:rtpReceiver];
//        NSLog(@"WebRTCManager didAddReceiver ##### ##### ##### ##### ##### ##### ##### ##### 2");
//    } else {
//        NSLog(@"WebRTCManager didAddReceiver ##### ##### ##### ##### ##### ##### ##### ##### error");
//    }

    NSLog(@"WebRTCManager didAddReceiver ##### ##### ##### ##### ##### ##### ##### ##### 10");
};

@end
