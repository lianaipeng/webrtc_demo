//
//  main.m
//  ios
//
//  Created by 连爱朋 on 2019/12/11.
//  Copyright © 2019 demo. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "AppDelegate.h"
#import "WebSocketManager.h"

int main(int argc, char * argv[]) {
    /*
    if ([WebSocketManager shared].socketStatus == WebSocketStatusConnect) {
        NSLog(@"WebSocketStatusConnect");
    } else {
        NSLog(@"WebSocketStatusDisConnect");
        [[WebSocketManager shared] openWebScoket];
    }
    */
    
    NSString * appDelegateClassName;
    @autoreleasepool {
        // Setup code that might create autoreleased objects goes here.
        appDelegateClassName = NSStringFromClass([AppDelegate class]);
    }
    return UIApplicationMain(argc, argv, nil, appDelegateClassName);
}
