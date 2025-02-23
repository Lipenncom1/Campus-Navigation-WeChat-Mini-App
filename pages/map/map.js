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
        showCampusOnly: false
    },

    onLoad(options) {
        this.initMapState(options);
        this.setupLocationWatcher();
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
        this.setData({ searchKeyword: e.detail.value });
    },

    handleSearchSubmit() {
        if (!this.data.searchKeyword.trim()) {
            this.showToast('请输入搜索关键词');
            return;
        }
        
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
        if (!this.data.canNavigate) {
            this.showToast('校外用户仅限查看校园地图');
            return;
        }
    
        const target = {
            latitude: e.currentTarget.dataset.latitude,
            longitude: e.currentTarget.dataset.longitude
        };
    
        try {
            const plugin = requirePlugin('routePlan');
            wx.navigateTo({
                url: `plugin://routePlan/index?key=${TENCENT_MAP_KEY}&referer=鲁大导航&endPoint=${encodeURIComponent(JSON.stringify({
                    name: "目的地",
                    latitude: target.latitude,
                    longitude: target.longitude
                }))}`
            });
        } catch (err) {
            this.showToast('导航功能初始化失败');
        }
    },

    showToast(msg) {
        wx.showToast({ title: msg, icon: 'none' });
    },
    
    onUnload() {
        wx.stopLocationUpdate();
    }
});