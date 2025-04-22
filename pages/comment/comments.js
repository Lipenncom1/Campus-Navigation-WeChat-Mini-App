// pages/comment/comments.js
Page({
  data: {
    comment: '',
    score: 0,
    images: [],
    commentList: [], // 评论列表
    replyComment: '', // 回复评论内容
    replyTo: null, // 回复的评论索引
    isInputFocus: false, // 控制输入框聚焦
    tempImages: [], // 临时图片
    replyTarget: null, // 回复目标
    animationData: {},
    isReply: false, // 区分是否是回复评论
    isScorePopupVisible: false, // 控制评分弹窗显示
    userInfo: {} // 新增：用户信息
  },
  onLoad() {
    this.loadComments();
    this.getUserInfo(); // 获取用户信息
  },
  getUserInfo() {
    wx.getUserProfile({
      desc: '用于展示用户信息',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败', err);
      }
    });
  },
  onCommentChange(e) {
    this.setData({
      comment: e.detail.value
    });
  },
  onChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePaths = res.tempFilePaths;
        const cloudPath = `comments/${Date.now()}-${Math.floor(Math.random(0, 1) * 1000)}.${tempFilePaths[0].match(/\.(\w+)$/)[1]}`;
        try {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePaths[0]
          });
          this.setData({
            images: this.data.images.concat(uploadRes.fileID),
            tempImages: this.data.tempImages.concat(tempFilePaths)
          });
        } catch (error) {
          console.error('图片上传失败', error);
        }
      }
    });
  },
  async onSubmit() {
    const { comment, score, images, userInfo } = this.data;
    if (!comment && score === 0 && images.length === 0) {
      wx.showToast({
        title: '请输入评论、打分或上传图片',
        icon: 'none'
      });
      return;
    }
    try {
      const newComment = {
        comment,
        score,
        images,
        replies: [],
        isLiked: false,
        likeCount: 0,
        avatar: userInfo.avatarUrl,
        nickname: userInfo.nickName,
        time: new Date().toLocaleString()
      };
      const db = wx.cloud.database();
      const res = await db.collection('comments').add({
        data: newComment
      });
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });
      this.setData({
        comment: '',
        score: 0,
        images: [],
        tempImages: [],
        isReply: false
      });
      this.loadComments();
    } catch (error) {
      console.error('评论提交失败', error);
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    }
  },
  onReplyChange(e) {
    this.setData({
      replyComment: e.detail.value
    });
  },
  async onReplySubmit(e) {
    const { replyComment, commentList, replyTo, userInfo } = this.data;
    if (!replyComment) {
      wx.showToast({
        title: '请输入回复内容',
        icon: 'none'
      });
      return;
    }
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const commentId = commentList[replyTo]._id;
      await db.collection('comments').doc(commentId).update({
        data: {
          replies: _.push({
            content: replyComment,
            fromNick: userInfo.nickName
          })
        }
      });
      wx.showToast({
        title: '回复成功',
        icon: 'success'
      });
      this.setData({
        replyComment: '',
        replyTo: null,
        isReply: false
      });
      this.loadComments();
    } catch (error) {
      console.error('回复提交失败', error);
      wx.showToast({
        title: '回复失败',
        icon: 'none'
      });
    }
  },
  onReplyClick(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      replyTo: index,
      isReply: true,
      isInputFocus: true
    });
    // 滚动到输入框
    wx.createSelectorQuery().select('.publish-bar').boundingClientRect(rect => {
      wx.pageScrollTo({ scrollTop: rect.top + wx.getSystemInfoSync().windowHeight - 300 });
    }).exec();
  },
  // 图片预览
  previewImage(e) {
    const currentImage = e.currentTarget.dataset.src;
    const commentIndex = e.currentTarget.dataset.commentIndex;
    const comment = this.data.commentList[commentIndex];
    wx.previewImage({
      current: currentImage,
      urls: comment.images
    });
  },
  // 点赞动画
  async toggleLike(e) {
    const commentId = e.currentTarget.dataset.commentId;
    const idx = commentId;
    const newComments = [...this.data.commentList];

    // 动画
    const animation = wx.createAnimation({ duration: 300 });
    animation.scale(1.2).rotate(15).step();
    this.setData({
      animationData: animation.export(),
      [`commentList[${idx}].isLiked`]: !newComments[idx].isLiked,
      [`commentList[${idx}].likeCount`]: newComments[idx].likeCount + (newComments[idx].isLiked ? -1 : 1)
    });
    wx.vibrateShort();

    try {
      const db = wx.cloud.database();
      const _ = db.command;
      await db.collection('comments').doc(newComments[idx]._id).update({
        data: {
          isLiked: !newComments[idx].isLiked,
          likeCount: _.inc(newComments[idx].isLiked ? -1 : 1)
        }
      });
    } catch (error) {
      console.error('点赞操作失败', error);
    }
  },
  // 加载更多
  async loadMoreComments() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('comments').get();
      this.setData({ commentList: res.data });
    } catch (error) {
      console.error('加载更多评论失败', error);
    }
  },
  // 显示评分弹窗
  showScorePopup() {
    this.setData({
      isScorePopupVisible: true
    });
  },
  // 隐藏评分弹窗
  hideScorePopup() {
    this.setData({
      isScorePopupVisible: false
    });
  },
  // 处理滑动打分事件
  onScoreChange(e) {
    const score = e.detail.value;
    this.setData({ score });
    wx.vibrateShort(); // 触觉反馈
  },
  // 确认分数
  confirmScore() {
    this.setData({
      isScorePopupVisible: false
    });
    // 可以在这里添加其他逻辑，比如在提交评论时使用这个分数
    console.log('用户确认的分数是:', this.data.score);
  },
  async loadComments() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('comments').get();
      console.log('评论数据:', res.data); // 打印评论数据，方便调试
      // 转换图片URL
    const comments = await Promise.all(res.data.map(async comment => {
        if (comment.images && comment.images.length) {
        const images = await Promise.all(comment.images.map(async cloudPath => {
            // 获取临时文件URL
            const { tempFileURL } = await wx.cloud.getTempFileURL({
            fileList: [cloudPath]
            })
            return tempFileURL
        }))
        return { ...comment, images }
        }
        return comment
    }))
      this.setData({ commentList: res.data });
    } catch (error) {
      console.error('加载评论失败', error);
    }
  }
});