# webrtc_demo  

getUserMedia ERROR:  
chrome://flags/#unsafely-treat-insecure-origin-as-secure  
添加网页地址  
开启摄像头和麦克风  


###############################################################  
Mesh 网格, 每个人都跟其他人单独建立连接. 4个人的情况下, 每个人建立3个连接, 也就是3个上传流和3个下载流. 此方案对客户端网络和计算能力要求最高, 对服务端没有特别要求.

SFU(Selective Forwarding Unit) 可选择转发单元, 有一个中心单元, 负责转发流. 每个人只跟中心单元建立一个连接, 上传自己的流, 并下载别人的流. 4个人的情况下, 每个人建立一个连接, 包括1个上传流和3个下载流. 此方案对客户端要求较高, 对服务端要求较高.

MCU(Multipoint Control Unit) 多端控制单元, 有一个中心单元, 负责混流处理和转发流. 每个人只跟中心单元建立一个连接, 上传自己的流, 并下载混流. 4个人的情况下, 每个人建立一个连接, 包括1个上传流和1个下载流. 此方案对客户端没有特别要求, 对服务端要求最高.

参考：  
https://www.jianshu.com/p/8c10146afd6c

一对一视频:  
https://blog.csdn.net/qq_24949727/article/details/68927202  
https://blog.csdn.net/qq_41875664/article/details/98870798  
多人视频:  
https://blog.csdn.net/qq_41875664/article/details/98870831  
