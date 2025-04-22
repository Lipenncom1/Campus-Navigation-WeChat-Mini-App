// pages/index/index.js
import { CAMPUS_POLYGON } from '../../utils/geoFenceSetting';
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    motto: '鲁东大学校园导航系统',
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    hotSearchKeywords: [] // 新增数据字段，用于存储热门搜索关键词
  },
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    const { nickName } = this.data.userInfo
    this.setData({
      "userInfo.avatarUrl": avatarUrl,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  onInputChange(e) {
    const nickName = e.detail.value
    const { avatarUrl } = this.data.userInfo
    this.setData({
      "userInfo.nickName": nickName,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  navigateToMaps() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const isInside = true//this.isPointInPolygon(res)
        //逻辑更改为true为了测试导航功能
        console.log(isInside)
        if (isInside) {
          wx.navigateTo({
            url: `/pages/map/map?lat=${res.latitude}&lng=${res.longitude}`
          })
        } else {
          console.log("run here1");
          wx.navigateTo({
            //url: `/pages/map/map?lat=${37.5207}&lng=${121.359}`
            //直接使用map.js自带硬编辑经纬度
            url: '/pages/map/map',
          })
        }
      },
      fail: () => {
        wx.showToast({ title: '定位失败', icon: 'none' })
      }
    })
  },
  navigateToCommunity() {
    wx.navigateTo({
      url: '/pages/comment/comments'
    });
  },
  isPointInPolygon(point) {
    let crossings = 0
    const polygon = CAMPUS_POLYGON
    
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length
      const [a, b] = [polygon[i], polygon[j]]
      
      if (((a.longitude > point.longitude) !== (b.longitude > point.longitude)) &&
          (point.latitude < (b.latitude - a.latitude) * (point.longitude - a.longitude) / (b.longitude - a.longitude) + a.latitude)) {
        crossings++
      }
    }
    return crossings % 2 === 1
  },
  onLoad() {
    wx.cloud.callFunction({
      name: 'getHotSearchKeywords', // 替换为你的云函数名称
      success: res => {
        console.log('热门搜索关键词:', res.result);
        this.setData({
          hotSearchKeywords: res.result
        });
      },
      fail: err => {
        console.error('调用云函数失败:', err);
      }
    });
  }
});