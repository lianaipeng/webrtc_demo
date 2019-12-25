//
//  WebSocketManager.m
//  ios
//
//  Created by 连爱朋 on 2019/12/12.
//  Copyright © 2019 demo. All rights reserved.
//  参考：https://www.jianshu.com/p/6946715990ad
//  参考：https://www.jianshu.com/p/6b870f503905
//

#import "WebSocketManager.h"
#import "AFNetworking.h"
#import "WebRTCManager.h"

#define dispatch_main_async_safe(block)\
    if ([NSThread isMainThread]) {\
        block();\
    } else {\
        dispatch_async(dispatch_get_main_queue(), block);\
    }

// 代理
@interface WebSocketManager ()<SRWebSocketDelegate>

@property(nonatomic, strong) NSTimer *heartBeatTimer;
@property(nonatomic, strong) NSTimer *netTestingTimer;
@property(nonatomic, assign) NSTimeInterval reconnectTime;       // 重连时间

@end


// 类
@implementation WebSocketManager

+(instancetype)shared {
    static WebSocketManager *_instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        _instance = [[self alloc] init];
    });
    return _instance;
}
-(instancetype)init {
    self = [super init];
    if (self) {
        self.reconnectTime = 0;
        self.isConnect = NO;
        //self.sendDataArray = [[NSMutableArray alloc]init];
        NSLog(@"WebSocketManager (instancetype)init");
    }
    return self;
}
// 建立长链接
-(void)openWebScoket {
    self.webSocket = nil;
    
    NSLog(@"WebSocketManager openWebScoket");
    self.webSocket = [[SRWebSocket alloc] initWithURL:[NSURL URLWithString:@"ws://10.10.10.87:8888"]];
    self.webSocket.delegate = self;
    [self.webSocket open];
    
    //[self initHeartBeatTimer];
}
// 重新建立长链接
-(void)reopenWebSocket {
    if (self.webSocket.readyState == SR_OPEN) {
        return;
    }
    __weak typeof(self)ws = self;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(self.reconnectTime * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        if (self.webSocket.readyState == SR_OPEN && ws.webSocket.readyState == SR_CONNECTING) {
            return ;
        }
        
        [ws openWebScoket];
        //NSLog(@"重新连接......");
        if (ws.reconnectTime == 0) {
            ws.reconnectTime = 2;
        } else {
            ws.reconnectTime *= 2;
        }
    });
}
// 关闭长链接
-(void)closeWebSocket {
    self.isConnect = NO;
    self.socketStatus = WebSocketStatusDefault;
    
    if (self.webSocket != nil) {
        [self.webSocket close];
        self.webSocket = nil;
    }
    
    [self destroyHeartBeat];
    [self destoryNetTesting];
}

-(void)initHeartBeatTimer {
    NSLog(@"WebSocketManager initHeartBeatTimer");
    //心跳没有被关闭
    if (self.heartBeatTimer) {
        return;
    }
    [self destroyHeartBeat];
    dispatch_main_async_safe(^{
        self.heartBeatTimer = [NSTimer timerWithTimeInterval:10 target:self selector:@selector(sendHeartBeat) userInfo:nil repeats:YES];
        [[NSRunLoop currentRunLoop] addTimer:self.heartBeatTimer forMode:NSRunLoopCommonModes];
    });
}

-(void)sendPing:(id)sender{
    NSLog(@"WebSocketManager sendPing");
    NSData *heartData = [[NSData alloc] initWithBase64EncodedString:@"heart" options:NSUTF8StringEncoding];
    [self.webSocket sendPing:heartData];
}

-(void)sendHeartBeat {
    //NSLog(@"WebSocketManager sendHeartBeat");
    //和服务端约定好发送什么作为心跳标识，尽可能的减小心跳包大小
    __weak typeof(self) ws = self;
    dispatch_main_async_safe(^{
        if (ws.webSocket.readyState == SR_OPEN) {
            [ws sendPing:nil];
        } else if (ws.webSocket.readyState == SR_CONNECTING) {
            NSLog(@"WebSocketManager sendHeartBeat SR_CONNECTING");
            //[ws reopenWebSocket];
        } else if (ws.webSocket.readyState == SR_CLOSED || ws.webSocket.readyState == SR_CLOSING) {
            NSLog(@"WebSocketManager sendHeartBeat SR_CLOSED|SR_CLOSING");
            [ws reopenWebSocket];
        } else {
            NSLog(@"WebSocketManager sendHeartBeat OTHER");
        }
    });
}

-(void)destroyHeartBeat {
    NSLog(@"WebSocketManager destroyHeartBeat");
    __weak typeof(self) ws = self;
    dispatch_main_async_safe(^{
        if (ws.heartBeatTimer) {
            [ws.heartBeatTimer invalidate];
            ws.heartBeatTimer = nil;
        }
    })
}
// 么有网络的时候开始定时
-(void)initNetTestingTimer {
    __weak typeof(self) ws = self;
    dispatch_main_async_safe(^{
        ws.netTestingTimer = [NSTimer scheduledTimerWithTimeInterval:1.0 target:self selector:@selector(startNetTesting) userInfo:nil repeats:YES];
        [[NSRunLoop currentRunLoop] addTimer:ws.netTestingTimer forMode:NSDefaultRunLoopMode];
    });
}
// 定时网络检测
-(void)startNetTesting {
    if (AFNetworkReachabilityManager.sharedManager.networkReachabilityStatus != AFNetworkReachabilityStatusNotReachable){
        [self destoryNetTesting];
        
        [self reopenWebSocket];
    }
}
// 取消网络检测
-(void)destoryNetTesting {
    __weak typeof(self) ws = self;
    dispatch_main_async_safe(^{
        if (ws.netTestingTimer) {
            [ws.netTestingTimer invalidate];
            ws.netTestingTimer = nil;
        }
    });
}

// #################### websocket 自定义函数 ###################
-(void)sendData:(NSString *)data {
    //[self.sendDataArray addObject:data];
    if (AFNetworkReachabilityManager.sharedManager.networkReachabilityStatus == AFNetworkReachabilityStatusNotReachable){
        NSLog(@"WebSocketManager sendData network not reachable");
        [self initNetTestingTimer];
    } else {
        if (self.webSocket != nil) {
            if (self.webSocket.readyState == SR_OPEN) {
                NSLog(@"WebSocketManager SR_OPEN %@", data);
                [self.webSocket send:data];
            } else if (self.webSocket.readyState == SR_CONNECTING) {
                NSLog(@"WebSocketManager SR_CONNECTING");
            } else if (self.webSocket.readyState == SR_CLOSING || self.webSocket.readyState == SR_CLOSED) {
                NSLog(@"WebSocketManager SR_CLOSING | SR_CLOSED");
                [self reopenWebSocket];
            } else {
                NSLog(@"WebSocketManager woyebuzhidao");
            }
        } else {
            NSLog(@"WebSocketManager self.webSocket == nil");
            [self openWebScoket];
        }
    }
}
// #################### websocket 自定义函数 ###################

// #################### websocket 回掉函数 ####################
// 成功回掉
- (void)webSocketDidOpen:(SRWebSocket *)webSocket {
    NSLog(@"WebSocketManager webSocketDidOpen Open Successed");
    //NSLog(@"连接成功，可以立刻登录你公司后台的服务器了，还有开启心跳");
    self.isConnect = YES;
    self.socketStatus = WebSocketStatusConnect;
    //开始心跳
    [self initHeartBeatTimer];
}
// 失败回掉
- (void)webSocket:(SRWebSocket *)webSocket didFailWithError:(NSError *)error {
    NSLog(@"WebSocketManager didFailWithError");
    //NSLog(@"连接失败，这里可以实现掉线自动重连，要注意以下几点");
    //NSLog(@"1.判断当前网络环境，如果断网了就不要连了，等待网络到来，在发起重连");
    //NSLog(@"2.判断调用层是否需要连接，例如用户都没在聊天界面，连接上去浪费流量");
    //NSLog(@"3.连接次数限制，如果连接失败了，重试10次左右就可以了，不然就死循环了。或者每隔1，2，4，8，10，10秒重连...f(x) = f(x-1) * 2, (x=5)");
    
    if (AFNetworkReachabilityManager.sharedManager.networkReachabilityStatus == AFNetworkReachabilityStatusNotReachable) {
        // 开启网络检测定时器
        [self initNetTestingTimer];
    } else {
        // 连接失败就重连
        [self reopenWebSocket];
    }
}
// 关闭回掉
- (void)webSocket:(SRWebSocket *)webSocket didCloseWithCode:(NSInteger)code reason:(NSString *)reason wasClean:(BOOL)wasClean{
    NSLog(@"WebSocketManager didCloseWithCode");
    //NSLog(@"连接断开，清空socket对象，清空该清空的东西，还有关闭心跳！");
    
    //断开时销毁心跳
    [self destroyHeartBeat];
    
    if (AFNetworkReachabilityManager.sharedManager.networkReachabilityStatus == AFNetworkReachabilityStatusNotReachable) {
        [self initNetTestingTimer];
    } else {
        //NSLog(@"关闭连接");
        webSocket = nil;
        [self reopenWebSocket];
    }
}
// 数据回掉
- (void)webSocket:(SRWebSocket *)webSocket didReceiveMessage:(id)message {
    NSLog(@"WebSocketManager didReceiveMessage %@", message);
    //NSLog(@"接收消息 ---- %@", message);
    /*
    if (self.delegate && [self.delegate respondsToSelector:@selector(webSocketDidReceiveMessage:)]) {
        [self.delegate webSocketDidReceiveMessage:message];
    }
    */
    [[WebRTCManager shared] recvDataWithString:message];
}

- (void)webSocket:(SRWebSocket *)webSocket didReceivePong:(NSData *)pongPayload {
    //NSLog(@"WebSocketManager didReceivePong %@", pongPayload);
}
// #################### websocket 回掉函数 ####################

@end
