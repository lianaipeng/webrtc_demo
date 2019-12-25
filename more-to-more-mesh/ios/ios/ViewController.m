//
//  ViewController.m
//  ios
//
//  Created by 连爱朋 on 2019/12/11.
//  Copyright © 2019 demo. All rights reserved.
//  参考：https://www.jianshu.com/p/e170bf0ebe7e
//

#import "ViewController.h"
#import "WebRTCManager.h"

@interface ViewController ()
@property (strong, nonatomic) IBOutlet UILabel *titleLabel;

@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view.
}
- (void)touchesBegan:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
    [self.view endEditing:YES];
}

- (IBAction)loginButton:(id)sender {
    NSLog(@"ViewController loginButton userNameText:%@", _userNameText.text);
    
    if ([_userNameText.text length] == 0) {
        //1.创建UIAlertControler
        UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"警告" message:@"登录名不能为空" preferredStyle:UIAlertControllerStyleAlert];
        /*
        参数说明：
         Title:弹框的标题
         message:弹框的消息内容
         preferredStyle:弹框样式：UIAlertControllerStyleAlert
         */
        //2.添加按钮动作
        //2.1 确认按钮
        UIAlertAction *conform = [UIAlertAction actionWithTitle:@"确认" style:UIAlertActionStyleDefault handler:^(UIAlertAction * _Nonnull action) {
            NSLog(@"点击了确认按钮");
        }];
        /*
        //2.2 取消按钮
        UIAlertAction *cancel = [UIAlertAction actionWithTitle:@"取消" style:UIAlertActionStyleCancel handler:^(UIAlertAction * _Nonnull action) {
            NSLog(@"点击了取消按钮");
        }];
         */
        
        /*
        //2.3 还可以添加文本框 通过 alert.textFields.firstObject 获得该文本框
        [alert addTextFieldWithConfigurationHandler:^(UITextField * _Nonnull textField) {
            textField.placeholder = @"请填写您的反馈信息";
        }];
         */
        
        //3.将动作按钮 添加到控制器中
        [alert addAction:conform];
        //[alert addAction:cancel];
           
        //4.显示弹框
        [self presentViewController:alert animated:YES completion:nil];
    } else {
        [[WebRTCManager shared] doLogin:@"login" LoginUser:_userNameText.text];
    }
}

@end
