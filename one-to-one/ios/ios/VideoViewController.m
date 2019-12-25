//
//  VideoViewController.m
//  ios
//
//  Created by 连爱朋 on 2019/12/11.
//  Copyright © 2019 demo. All rights reserved.
//

#import "VideoViewController.h"
#import "WebSocketManager.h"
#import "WebRTCManager.h"

//#import <WebRTC/WebRTC.h>
#import "WebRTC.framework/Headers/WebRTC.h"

#define kWidth [UIScreen mainScreen].bounds.size.width
#define kHeight [UIScreen mainScreen].bounds.size.height

@interface VideoViewController () <WebRTCManagerDelegate, RTCVideoViewDelegate>
@property (strong, nonatomic) IBOutlet UITextField *remoteUserText;
@property (nonatomic, strong) RTCVideoTrack *localVideoTrack;

@property (nonatomic, strong) RTCVideoTrack *remoteVideoTracks;
@property (nonatomic, strong) RTCMTLVideoView *remoteVideoView;

@end



@implementation VideoViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view.
    
    WebRTCManager *webRTCManager = [WebRTCManager shared];
    [webRTCManager setDelegate:self];
    
    NSLog(@"VideoViewController viewDidLoad ###############");
}

-(void) touchesBegan:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event {
    [self.view endEditing:YES];
}

-(IBAction)callButton:(id)sender {
    NSLog(@"VideoViewController callButton start ………………^_^");
    NSString *remoteUser = _remoteUserText.text;
    [[WebRTCManager shared] doCall:remoteUser];
    NSLog(@"VideoViewController callButton end ………………^_^");
}
/*
#pragma mark - Navigation

// In a storyboard-based application, you will often want to do a little preparation before navigation
- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
    // Get the new view controller using [segue destinationViewController].
    // Pass the selected object to the new view controller.
}
*/

-(void)webRTCManager:(WebRTCManager *)webRTCManager setLocalStream:(RTCMediaStream *)stream {
    NSLog(@"VideoViewController setLocalStream ……………………^_^ 1");
    RTCEAGLVideoView *localView = [[RTCEAGLVideoView alloc] initWithFrame:CGRectMake(10, 200, 100, 200)];
    // 标记本地摄像头
    [localView setTag:10086];
    // FIXME: 实现本地/远程图像不被拉伸变形
    [localView setDelegate:self];

    _localVideoTrack = [stream.videoTracks lastObject];
    [_localVideoTrack addRenderer:localView];

    [self.view addSubview:localView];
    NSLog(@"VideoViewController setLocalStream ……………………^_^ 4");
}

-(void)webRTCManager:(WebRTCManager *)webRTCManager setLocalCapturer:(RTCCameraVideoCapturer *)capturer {
    NSLog(@"VideoViewController setLocalCapturer ……………………^_^ 1");
    RTCCameraPreviewView *localView = [[RTCCameraPreviewView alloc] initWithFrame:CGRectMake(0, 200, 150, 300)];
    [localView setCaptureSession:[capturer captureSession]];

    [self.view addSubview:localView];
}

-(void)webRTCManager:(WebRTCManager *)webRTCManager addRemoteReceiver:(RTCRtpReceiver *)receiver {
    NSLog(@"VideoViewController addRemoteReceiver ……………………^_^ 1");
//    RTCMediaStreamTrack *track = receiver.track;
//    if ([track.kind isEqualToString:kRTCMediaStreamTrackKindVideo]) {
//        _remoteVideoView = [[RTCMTLVideoView alloc] initWithFrame:CGRectMake(30, 220, 100, 200)];
//
////        _remoteVideoTracks = (RTCVideoTrack *)track;
////        [_remoteVideoTracks addRenderer:_remoteVideoView];
////
//        [self.view addSubview:_remoteVideoView];
//    }
    NSLog(@"VideoViewController addRemoteReceiver ……………………^_^ 2");
}

-(void)webRTCManager:(WebRTCManager *)webRTCManager addRemoteStream:(RTCMediaStream *)stream {
    NSLog(@"VideoViewController addRemoteStream ……………………^_^ 1 %@", stream);
    
    __weak __typeof(self) weakself= self;
    dispatch_async(dispatch_get_main_queue(), ^{
     // 通知主线程刷新 神马的
//        UIView *v = [[UIView alloc] initWithFrame:CGRectMake(300, 200, 100, 200)];
//        v.backgroundColor = [UIColor redColor];
//        [self.view addSubview:v];
//
        weakself.remoteVideoTracks = [stream.videoTracks lastObject];
        RTCEAGLVideoView *remoteVideoView = [[RTCEAGLVideoView alloc] initWithFrame:CGRectMake(205, 200, 200, 300)];
        remoteVideoView.backgroundColor = [UIColor redColor];
        [remoteVideoView setDelegate:weakself];
        [weakself.remoteVideoTracks addRenderer:remoteVideoView];
        [weakself.view addSubview:remoteVideoView];
        
    });
    NSLog(@"VideoViewController addRemoteStream ……………………^_^ 4");
}

- (void)videoView:(id<RTCVideoRenderer>)videoView didChangeVideoSize:(CGSize)size
{
    
}

@end
