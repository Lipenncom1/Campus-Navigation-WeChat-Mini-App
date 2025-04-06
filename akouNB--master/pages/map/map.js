import { CAMPUS_POLYGON } from '../../utils/geoFenceSetting';
import { TENCENT_MAP_KEY } from '../../utils/config';

Page({
    data: {
        longitude: 121.359008, //鲁东基本位置
        latitude: 37.520700,
        markers: [],
        canNavigate: true,
        searchKeyword: '',
        searchResults: [],
        showCampusOnly: false,
        destination: null,
        searchHistory: [],
        showSearchHistory: false, // 控制搜索历史的显示
        filteredSearchHistory: [] // 新增：过滤后的搜索历史
    },

    onLoad(options) {
        this.initMapState(options);
        this.setupLocationWatcher();
        this.loadSearchHistory(); // 加载搜索历史
    },

    initMapState(options) {
        if (options.lat && options.lng) {
            this.setData({
                latitude: parseFloat(options.lat),
                longitude: parseFloat(options.lng)
            });
        }
        if (options.canNavigate === 'false') {
            this.setData({ 
                canNavigate: false,
                showCampusOnly: true
            });
        }
    },

    setupLocationWatcher() {
        wx.startLocationUpdateBackground({
            success: () => {
                wx.onLocationChange(this.handleLocationUpdate);
            }
        });
    },

    handleLocationUpdate(res) {
        if (this.data.showCampusOnly) return;

        const newPosition = {
            latitude: res.latitude,
            longitude: res.longitude,
            iconPath: '/images/location.png',
            width: 30,
            height: 30
        };

        this.setData({
            markers: [newPosition],
            canNavigate: this.checkInCampus(res)
        });
    },

    checkInCampus(location) {
        let crossings = 0;
        for (let i = 0; i < CAMPUS_POLYGON.length; i++) {
            const j = (i + 1) % CAMPUS_POLYGON.length;
            const [a, b] = [CAMPUS_POLYGON[i], CAMPUS_POLYGON[j]];
          
            if (((a.longitude > location.longitude) !== (b.longitude > location.longitude)) &&
                (location.latitude < (b.latitude - a.latitude) * 
                (location.longitude - a.longitude) / 
                (b.longitude - a.longitude) + a.latitude)) {
                    crossings++;
            }
        }
        return crossings % 2 === 1;
    },

    handleSearchInput(e) {
        const keyword = e.detail.value;
        this.setData({ searchKeyword: keyword });
        console.log('search input');
        // 输入关键词后隐藏搜索历史
        if (keyword) {
            this.setData({ showSearchHistory: false });
            // 过滤搜索历史
            const filtered = this.data.searchHistory.filter(item => item.includes(keyword));
            this.setData({ filteredSearchHistory: filtered });
        } else {
            this.setData({ showSearchHistory: true, filteredSearchHistory: this.data.searchHistory.slice(0, 3) });
        }
    },

    handleSearchSubmit() {
        if (!this.data.searchKeyword.trim()) {
            this.showToast('请输入搜索关键词');
            return;
        }
        console.log("get the data from the input box");
        
        wx.request({
            url: 'https://apis.map.qq.com/ws/place/v1/search',
            data: {
                keyword: this.data.searchKeyword,
                boundary: `nearby(${this.data.latitude},${this.data.longitude},1000)`,
                key: TENCENT_MAP_KEY,
                page_size: 5
            },
            success: (res) => {
                if (res.data.status === 0 && res.data.data) {
                    const results = res.data.data.map(item => ({
                        id: item.id,
                        title: item.title,
                        address: item.address,
                        latitude: item.location.lat,
                        longitude: item.location.lng
                    }));
                    
                    // 更新搜索结果和地图标记
                    console.log("output the searching result");
                    console.log(results);
                    const markers = results.map((item, index) => ({
                        id: index,
                        latitude: item.latitude,
                        longitude: item.longitude,
                        title: item.title,
                        iconPath: '/images/marker.png',
                        width: 30,
                        height: 30
                    }));
                    this.setData({
                        searchResults: results,
                        markers: markers
                    });
                    this.saveSearchHistory(this.data.searchKeyword); // 保存搜索历史
                } else {
                    this.showToast('搜索失败：' + (res.data.message || '未知错误'));
                }
            },
            fail: (err) => {
                console.error('搜索请求失败:', err);
                this.showToast('搜索服务暂时不可用');
            }
        });
    },

    startNavigation(e) {
        console.log("开始导航服务选择");
        if (!this.data.canNavigate) {
            this.showToast('校外用户仅限查看校园地图');
            return;
        }
    
        const target = {
            latitude: e.currentTarget.dataset.latitude,
            longitude: e.currentTarget.dataset.longitude,
            name: e.currentTarget.dataset.title || "目的地",
            address: e.currentTarget.dataset.address || ""
        };
    
        wx.showActionSheet({
            itemList: ['查看路线规划', '使用外部导航'],
            success: (res) => {
                switch (res.tapIndex) {
                    case 0:  // 查看路线规划选择
                        try {
                            const plugin = requirePlugin('routePlan');
                            console.log("调用路线规划api服务");
                            wx.navigateTo({
                                url: `plugin://routePlan/index?key=${TENCENT_MAP_KEY}&referer=鲁大导航&endPoint=${encodeURIComponent(JSON.stringify({
                                    name: target.name,
                                    latitude: target.latitude,
                                    longitude: target.longitude
                                }))}`
                            });
                        } catch (err) {
                            this.showToast('路线规划功能初始化失败');
                        }
                        break;
                    
                    case 1:  // 使用外部导航
                        console.log("start outside app navigation");
                        wx.getLocation({
                            type: 'gcj02',
                            success: (location) => {
                                wx.showModal({
                                    title: '导航提示',
                                    content: '是否打开外部app进行导航？',
                                    success: (res) => {
                                        if (res.confirm) {
                                            wx.openLocation({
                                                latitude: parseFloat(target.latitude),
                                                longitude: parseFloat(target.longitude),
                                                name: target.name,
                                                address: target.address,
                                                scale: 18
                                            });
                                        }
                                    }
                                });
                            },
                            fail: () => {
                                this.showToast('获取当前位置失败');
                            }
                        });
                        break;
                }
            }
        });
    },

    showToast(msg) {
        wx.showToast({ title: msg, icon: 'none' });
    },
    
    onUnload() {
        wx.stopLocationUpdate();
    },

    // 加载搜索历史
    loadSearchHistory() {
        const searchHistory = wx.getStorageSync('searchHistory') || [];
        this.setData({
            searchHistory,
            filteredSearchHistory: searchHistory.slice(0, 3)
        });
    },

    // 保存搜索历史
    saveSearchHistory(keyword) {
        let searchHistory = wx.getStorageSync('searchHistory') || [];
        // 检查是否已存在该关键词，若存在则移除
        const index = searchHistory.indexOf(keyword);
        if (index !== -1) {
            searchHistory.splice(index, 1);
        }
        // 将关键词添加到数组头部
        searchHistory.unshift(keyword);
        // 限制搜索历史数量为最近五条
        if (searchHistory.length > 5) {
            searchHistory = searchHistory.slice(0, 5);
        }
        wx.setStorageSync('searchHistory', searchHistory);
        this.setData({
            searchHistory,
            filteredSearchHistory: searchHistory.slice(0, 3)
        });
    },

    // 点击搜索历史项进行搜索
    onSearchHistoryClick(e) {
        const keyword = e.currentTarget.dataset.keyword;
        this.setData({
            searchKeyword: keyword,
            showSearchHistory: false // 点击搜索历史项后隐藏搜索历史
        });
        this.handleSearchSubmit();
    },

    // 聚焦搜索框时显示搜索历史
    onSearchInputFocus() {
        if (!this.data.searchKeyword) {
            this.setData({ showSearchHistory: true, filteredSearchHistory: this.data.searchHistory.slice(0, 3) });
        }
    }
});