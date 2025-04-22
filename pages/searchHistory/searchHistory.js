Page({
    data: {
        searchHistory: []
    },
  
    onLoad() {
        this.loadSearchHistory();
    },
  
    loadSearchHistory() {
        const searchHistory = wx.getStorageSync('searchHistory') || [];
        this.setData({ searchHistory });
    },
  
    onHistoryItemClick(e) {
        const keyword = e.currentTarget.dataset.keyword;
        getApp().globalData.lastSearchKeyword = keyword;
        wx.navigateBack({
            delta: 1,
            success: () => {
                const pages = getCurrentPages();
                const prevPage = pages[pages.length - 1];
                prevPage.setData({
                    searchKeyword: keyword
                }, () => {
                    prevPage.handleSearchSubmit();
                });
            }
        });
    },
  
    clearSearchHistory() {
        wx.showModal({
            title: '提示',
            content: '确定要清空所有搜索历史吗？',
            success: (res) => {
                if (res.confirm) {
                    wx.setStorageSync('searchHistory', []);
                    this.setData({ searchHistory: [] });
                }
            }
        });
    },
});