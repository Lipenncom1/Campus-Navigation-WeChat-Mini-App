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
    isScoreSelectorVisible: false // 控制评分选择器显示
  },
  onLoad() {
    // 加载评论列表
    const commentList = wx.getStorageSync('commentList') || [];
    this.setData({ commentList });
  },
  onCommentChange(e) {
    this.setData({
      comment: e.detail.value
    });
  },
  onScoreChange(e) {
    this.setData({
      score: e.detail.value
    });
  },
  onChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        this.setData({
          images: this.data.images.concat(tempFilePaths),
          tempImages: this.data.tempImages.concat(tempFilePaths)
        });
      }
    });
  },
  onSubmit() {
    const { comment, score, images, commentList } = this.data;
    if (!comment && score === 0 && images.length === 0) {
      wx.showToast({
        title: '请输入评论、打分或上传图片',
        icon: 'none'
      });
      return;
    }
    const newComment = {
      id: Date.now(),
      comment,
      score,
      images,
      replies: [], // 该评论的回复列表
      isLiked: false,
      likeCount: 0,
      avatar: '',
      nickname: '',
      time: new Date().toLocaleString()
    };
    commentList.unshift(newComment);
    wx.setStorageSync('commentList', commentList);
    wx.showToast({
      title: '提交成功',
      icon: 'success'
    });
    this.setData({
      comment: '',
      score: 0,
      images: [],
      commentList,
      isReply: false
    });
  },
  onReplyChange(e) {
    this.setData({
      replyComment: e.detail.value
    });
  },
  onReplySubmit(e) {
    const { replyComment, commentList, replyTo } = this.data;
    if (!replyComment) {
      wx.showToast({
        title: '请输入回复内容',
        icon: 'none'
      });
      return;
    }
    commentList[replyTo].replies.push({
      content: replyComment,
      fromNick: ''
    });
    wx.setStorageSync('commentList', commentList);
    wx.showToast({
      title: '回复成功',
      icon: 'success'
    });
    this.setData({
      replyComment: '',
      replyTo: null,
      commentList,
      isReply: false
    });
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
  // 点击评分星标
  onScoreSelect(e) {
    const score = parseInt(e.currentTarget.dataset.index) + 1;
    this.setData({ score });
    wx.vibrateShort(); // 触觉反馈
    this.hideScoreSelector();
  },
  // 图片预览
  previewImage(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.src,
      urls: this.data.tempImages
    });
  },
  // 点赞动画
  toggleLike(e) {
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
  },
  // 加载更多
  loadMoreComments() {
    // 模拟加载更多
    const newComments = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      comment: `模拟评论${i}`,
      score: Math.ceil(Math.random() * 5),
      images: Math.random() > 0.5 ? [`https://picsum.photos/300/300?random=${i}`] : [],
      replies: [],
      isLiked: false,
      likeCount: 0,
      avatar: '',
      nickname: '',
      time: new Date().toLocaleString()
    }));
    this.setData({ commentList: [...this.data.commentList, ...newComments] });
  },
  // 显示评分选择器
  showScoreSelector() {
    this.setData({
      isScoreSelectorVisible: true
    });
  },
  // 隐藏评分选择器
  hideScoreSelector() {
    this.setData({
      isScoreSelectorVisible: false
    });
  }
});