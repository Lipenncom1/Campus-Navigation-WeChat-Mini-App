// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })

    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-5gtjiuv7caccf735', // 替换为你的云环境 ID
        traceUser: true,
      })
    }
  },

  onError(err) {
    wx.reportMonitor('1', 1)
  },

  globalData: {
    userInfo: null,
    lastSearchKeyword: null,
  }
})