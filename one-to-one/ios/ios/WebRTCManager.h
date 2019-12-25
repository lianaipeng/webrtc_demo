//
//  WebRTCManager.h
//  ios
//
//  Created by 连爱朋 on 2019/12/14.
//  Copyright © 2019 demo. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "WebRTC.framework/Headers/WebRTC.h"

NS_ASSUME_NONNULL_BEGIN

@class WebRTCManager;
@class RTCMediaStream;
@class RTCCameraVideoCapturer;

// 代理类
@protocol WebRTCManagerDelegate <NSObject>

@optional
-(void)webRTCManager:(WebRTCManager *)webRTCManager setLocalStream:(RTCMediaStream *)stream;
-(void)webRTCManager:(WebRTCManager *)webRTCManager setLocalCapturer:(RTCCameraVideoCapturer *)capturer;
-(void)webRTCManager:(WebRTCManager *)webRTCManager addRemoteStream:(RTCMediaStream *)stream;
-(void)webRTCManager:(WebRTCManager *)webRTCManager addRemoteReceiver:(RTCRtpReceiver *)receiver;

//-(void)wocaoDelegate:(NSString *)string;

@end


// 管理类
@interface WebRTCManager : NSObject

+(instancetype)shared;

@property (nonatomic, weak) id<WebRTCManagerDelegate> delegate;

@property (nonatomic, strong) NSString *localUser;
@property (nonatomic, strong) NSString *remoteUser;


-(void)doLogin:(NSString *)messageType LoginUser:(NSString *)userName;
-(void)doCall:(NSString *)userName;

-(void)sendDataWithDictionary:(NSMutableDictionary *)dict;
-(void)recvDataWithString:(NSString *)message;


@end

NS_ASSUME_NONNULL_END
