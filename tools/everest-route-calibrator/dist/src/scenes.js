/**
 * LIVE 场景目录 + 官方地标数据库（纬度/经度/高程 来自权威来源，2006-2024 测量）。
 *
 * 相机档与航线档都是「真实地物」：所有 lat/lon/elevation 都必须在下面
 * （附录 pull 若干权威点）。模型不假定任何未来源可直接用于求解的「虚构点」。
 */
/** 珠峰 & 卢瓦措等主山（来源：USGS / Wikipedia；高程为 2020 china/尼泊尔共同测量等） */
export const LANDMARKS = [
    {
        id: "everest-summit",
        nameZh: "珠穆朗玛峰（8848.86）",
        nameEn: "Mount Everest",
        lat: 27.9881,
        lon: 86.925,
        elevationM: 8848.86,
        note: "2020 中尼共同公布高程",
    },
    {
        id: "everest-south-col",
        nameZh: "南坳（7900 岔）",
        nameEn: "South Col",
        lat: 27.9752,
        lon: 86.9315,
        elevationM: 7906,
        note: "South Col 鞍部",
    },
    {
        id: "lhotse-summit",
        nameZh: "洛子峰（8516）",
        nameEn: "Lhotse",
        lat: 27.9617,
        lon: 86.9336,
        elevationM: 8516,
        note: "",
    },
    {
        id: "nptse-summit",
        nameZh: "努子峰",
        nameEn: "Nuptse",
        lat: 27.9621,
        lon: 86.8928,
        elevationM: 7864,
        note: "",
    },
    {
        id: "ama",
        nameZh: "阿玛达布拉",
        nameEn: "Ama Dablam",
        lat: 27.8616,
        lon: 86.8608,
        elevationM: 6812,
        note: "",
    },
    {
        id: "changtse",
        nameZh: "章子峰",
        nameEn: "Changtse",
        lat: 28.025,
        lon: 86.8937,
        elevationM: 7543,
        note: "",
    },
    {
        id: "everest-west-shoulder",
        nameZh: "珠峰西肩",
        nameEn: "Everest West Shoulder",
        lat: 27.9953,
        lon: 86.8786,
        elevationM: 7400,
        note: "非官方峰；威斯岭（West Ridge）反身坡（约74xx m），共视线可辨→辅助定位",
    },
    {
        id: "pumori",
        nameZh: "普马里",
        nameEn: "Pumori",
        lat: 28.0339,
        lon: 86.8225,
        elevationM: 7161,
        note: "",
    },
    {
        id: "kala",
        nameZh: "卡拉帕塔",
        nameEn: "Kala Patthar",
        lat: 27.9837,
        lon: 86.787,
        elevationM: 5545,
        note: "LIVE-A 拍摄点（≈5545 m，2019）",
    },
    {
        id: "kalchhung",
        nameZh: "卡拉春",
        nameEn: "Kalchhung",
        lat: 28.007,
        lon: 86.754,
        elevationM: 5460,
        note: "Kala Patthar 北侧山脊",
    },
    {
        id: "lookout",
        nameZh: "33 号路口",
        nameEn: "Gosaikunda Viewpoint",
        lat: 28.075,
        lon: 86.517,
        elevationM: 3530,
        note: "",
    },
    {
        id: "pumori2",
        nameZh: "普马里东",
        nameEn: "Pumori East",
        lat: 28.038,
        lon: 86.832,
        elevationM: 6950,
        note: "",
    },
];
export const SCENES = [
    {
        id: "live-a",
        label: "LIVE-A · Kala Patthar",
        assetPath: "miniprogram/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
        width: 1080,
        height: 1920,
        cameraGuesses: {
            lat: 27.9989129,
            lon: 86.856634,
            elevationM: 5545,
            yawDeg: 100,
            pitchDeg: 30,
            rollDeg: 0,
            focalPx: 840, // EXIF GPS(27.9989129/86.856634)·Kala Patthar 东北缘取景；引导点仅吸附，真解由 solver
            note: "拍片点取相机 EXIF GPS（可能含 ±百米 UTM 误差）；初始俯角让主峰进中上部，引导点仅供吸附，真实解由 solver 定",
        },
        freedom: "6d",
        note: "Kala Patthar 遥望珠峰（↑审查标记 summit 位于上偏右）。",
    },
    {
        id: "live-b",
        label: "LIVE-B · Khumbu 谷",
        assetPath: "miniprogram/assets/expeditions/everest/live/live-b-khumbu.jpg",
        width: 1080,
        height: 1920,
        note: "未收录录像。",
    },
    {
        id: "live-c",
        label: "LIVE-C · 大本营",
        assetPath: "miniprogram/assets/expeditions/everest/live/live-c.jpg",
        width: 1080,
        height: 1920,
        note: "未实现。",
    },
    {
        id: "live-d",
        label: "LIVE-D · 南峰",
        assetPath: "miniprogram/assets/expeditions/everest/live/live-d.jpg",
        width: 1080,
        height: 1920,
        note: "未实现。",
    },
];
/** 透视 —— 保留一个额外计算标志 */
export function sceneById(id) {
    return SCENES.find((s) => s.id === id);
}
