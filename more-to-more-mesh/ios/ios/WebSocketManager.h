//
//  WebSocketManager.h
//  ios
//
//  Created by 连爱朋 on 2019/12/12.
//  Copyright © 2019 demo. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "SocketRocket.h"

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, WebSocketStatus){
    WebSocketStatusDefault = 0, //初始状态，未连接
    WebSocketStatusConnect,     //已连接
    WebSocketStatusDisConnect,  //断开连接
};

@class WebSocketManager;

/*
// 定义websocket 代理
@protocol WebSocketManagerDelegate <NSObject>
-(void)webSocketDidReceiveMessage:(NSString *)string;
//-(void)webRTCManager:(WebRTCManager *)webRTCManager setLocalStream:(RTCMediaStream *)stream;
//-(void)webSocketManager:(WebSocketManager *)webSocketManager didReceiveMessage:(NSString *)string;
@end
*/


// 定义websocket 类
@interface WebSocketManager : NSObject
@property(nonatomic,strong) SRWebSocket *webSocket;
//@property(nonatomic,weak) id<WebSocketManagerDelegate> delegate;
@property(nonatomic,assign) BOOL isConnect;
@property(nonatomic,assign) WebSocketStatus socketStatus;

//@property(nonatomic,strong) NSMutableArray *sendDataArray;    // 存储要发送给服务器的数据


+(instancetype)shared;
-(void)openWebScoket;
-(void)reopenWebSocket;
//-(void)reConnectServer;
-(void)closeWebSocket;
-(void)sendData:(NSString*)data;
@end


NS_ASSUME_NONNULL_END
