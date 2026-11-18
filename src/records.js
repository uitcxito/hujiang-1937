// Historical accounts and museum photographs are linked to their originals and opened on demand.
const buildingChronicle = ["沪江大学建筑简史", "https://iso.usst.edu.cn/2008/0529/c1109a9573/page.htm"];
const campusHistories = ["沪江大学历史建筑故事", "https://iso.usst.edu.cn/2008/0529/c1109a9576/page.htm"];
const residenceByOutline = "住宅名后的序号供导览定位。旧图没有逐户列出门牌，房屋外观依据本处轮廓和同期同类住宅推定。";
const residenceByGroup = "住宅名后的序号供导览定位。旧图和修缮图只能比对到住宅群，单栋外观参照同组住宅，附屋高度与背面仍是估计。";
const buildingRecords = {
  101: {
    observed: "1917年开业，老图将其置于校门旁。旧照可见两层主体、坡顶上的小窗和立面贯通的水平线脚。",
    inferred: "树木遮住了部分首层，入口位置、背立面、墙色与屋顶坡度为推定。",
    source: "https://buildings.usst.edu.cn/2018/1003/c882a30404/page.htm",
    links: [
      [
        "麦氏医院旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/87/30/5c3dc2e342b1b9230d01319939c5/ecfd33e2-2016-493d-8b80-0a6f14e9daeb.png",
      ],
    ],
  },
  102: {
    observed: "校门档案记载门房于1916年随校门启用，图例102标在道路旁。",
    inferred: "单层值守用房的门窗和顶面按用途推定，地图编号部分覆盖房基。",
    source: "https://buildings.usst.edu.cn/2018/1002/c882a30395/page.htm",
  },
  103: {
    observed: "图例103标作门口学校，校门进校园后在主路一侧，接近幼稚园。",
    inferred: "平面可定位。单层、矩形窗和门面方向暂按小学校舍推定。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [buildingChronicle],
  },
  104: {
    observed: "1924年思乔堂建成。图例104标作幼稚园，长边与门口学校同处一组院落。",
    inferred: "采用图中长条占地，层数、采光窗数量和外墙用材尚缺同期照片。",
    source: buildingChronicle[1],
    links: [
      ["思乔堂教师会议 · 1929年浸礼会年报（原书187页）",
        "https://s3.amazonaws.com/media2.sbhla.org/annuals/SBC_Annual_1929.pdf#page=196"],
    ],
  },
  105: {
    observed: "老图中英文分别标作西操场和 Play Shed，场地位于幼稚园旁。",
    inferred: "按英文图例暂作有顶活动棚，设开敞柱间；是否四面敞开、柱距和屋面形式待考。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [buildingChronicle],
  },
  111: {
    observed: "图上独立的中学部膳厅紧靠中学部场地，长轴与大学膳堂不同。",
    inferred: "未取得可识别为本栋的同期照片，层数与门窗依据用膳建筑类型推定。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [buildingChronicle],
  },
  112: {
    observed:
      "附中两栋校舍在图上并列。该栋旧照可见四层窗列、中央入口和凸窗，中央与两端的抱厦形成起伏的长立面。",
    inferred: "依本栋照片设置主立面。窗格、凸窗进深与檐部尺寸为推定。",
    source: "https://buildings.usst.edu.cn/2018/1003/c882a30405/page.htm",
    links: [
      [
        "思孟堂旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/87/09/a9b9101e46af8b9d00f3364f0e1e/d58e3646-5a7b-4776-8633-f37185607219.png",
      ],
      [
        "建筑手绘图",
        "https://buildings.usst.edu.cn/_upload/article/images/87/09/a9b9101e46af8b9d00f3364f0e1e/80ac632a-bdee-4ad1-b661-8cb51b9f7d4b.png",
      ],
    ],
  },
  113: {
    observed:
      "附中两栋校舍在图上并列。该栋旧照可见四层窗列、中央入口和凸窗，中央与两端的抱厦形成起伏的长立面。",
    inferred: "依本栋照片设置主立面。窗格、凸窗进深与檐部尺寸为推定。",
    source: "https://buildings.usst.edu.cn/2018/1003/c882a30406/page.htm",
    links: [
      ["附中主任记礼堂筹建", "https://buildings.usst.edu.cn/2018/1004/c882a30411/page.htm"],
      [
        "思雷堂旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/48/3b/a337d1b9495abb0bb8a85e0ca686/89cbdd9d-c7df-448f-82fc-9f6e70e48753.png",
      ],
      [
        "建筑手绘图",
        "https://buildings.usst.edu.cn/_upload/article/images/48/3b/a337d1b9495abb0bb8a85e0ca686/7fa29429-781f-4034-9110-9a788a3c4ba6.png",
      ],
    ],
  },
  114: {
    observed: "1935年建成。照片可见陡坡顶、长墙突出的山墙式门廊、一侧山墙的成组长窗及楼外成对梯段。",
    inferred: "梯段宽度、踏步数与另一端的开窗为估算，门廊方向参考图上小凸部。",
    source: "https://buildings.usst.edu.cn/2018/1004/c882a30411/page.htm",
    links: [
      buildingChronicle,
      [
        "中学部礼堂旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/5b/8e/c16d42ff4fa5bce5e8edf034e7d6/47b04763-54f0-46ab-acb7-379fcf2279f9.png",
      ],
      [
        "室外楼梯手绘图",
        "https://buildings.usst.edu.cn/_upload/article/images/5b/8e/c16d42ff4fa5bce5e8edf034e7d6/4d169364-5bb4-404e-99f5-6814f6748805.png",
      ],
    ],
  },
  121: {
    observed:
      "老照片可同时辨认长侧墙的小圆窗、入口山墙，以及另一翼低而宽的分格大窗。实物照片和1937年平面图均显示两翼相接。",
    inferred: "两翼的门窗对应到地图方向、砖色、背面和联接处的屋面交接按现有视图推定。",
    source: "https://www.usst.edu.cn/2022/0726/c999a47070/page.htm",
    links: [
      [
        "大礼堂与思魏堂旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/89/d5/89b1bbd24a3190a50830cb3c9e23/f39b9deb-a650-4e93-8068-f25ea718b2ac.png",
      ],
      ["图说与沿革", "https://buildings.usst.edu.cn/2018/1002/c882a30387/page.htm"],
    ],
  },
  131: {
    observed:
      "四层主体之上是带小老虎窗的第五层。单体旧照和1934年从黄浦江拍摄的鸟瞰照共同显示长廊朝向江岸；两端和中部各有一座山墙。",
    inferred: "长廊的准确进深、廊柱数和背面的凸窗细部按照片比例估计。1963年改为平顶。",
    source: "https://buildings.usst.edu.cn/2018/1004/c882a30408/page.htm",
    links: [
      [
        "宿舍正面旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/52/e8/f3ebdf8d4d18a3e5d60d483625f2/6c27d62d-f7be-4381-adaa-08c8cdc59a69.png",
      ],
      [
        "带长廊一面旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/52/e8/f3ebdf8d4d18a3e5d60d483625f2/d9c570bd-0d9f-423e-9bdc-8e2e8ea6c0aa.png",
      ],
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  132: {
    observed:
      "1932年建成，作女生健身房、膳厅和音乐室。旧照可辨突出的平顶入口、齿形女儿墙、两翼端部的小山花。平面图前后凸出深浅不同。",
    inferred: "沿图中十字轮廓安排主体，后翼屋面和窗列按用途推定。",
    source: "https://www.usst.edu.cn/2022/0726/c999a47075/page.htm",
    links: [
      campusHistories,
      [
        "艾德蒙堂旧照",
        "https://www.usst.edu.cn/_upload/article/images/0a/bb/3835bb0d46cbb886916574756cb9/93512afd-7d67-45da-b231-98458b3869c5.jpg",
      ],
      [
        "正面手绘图",
        "https://www.usst.edu.cn/_upload/article/images/0a/bb/3835bb0d46cbb886916574756cb9/a2f30fee-5d7b-4de2-a5ff-b7bee999bcbc.jpg",
      ],
    ],
  },
  133: {
    observed: "图例133为温室，位于科学馆背侧道路外，和江岸生物园分开。",
    inferred: "玻璃墙面、坡顶与格架体现园艺用途。框架间距、玻璃色泽和实际材料待考。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [["科学馆与生物部", "https://buildings.usst.edu.cn/2018/1002/c882a30388/page.htm"]],
  },
  141: {
    observed:
      "档案照片和馆方手绘图显示三层通高直墙、坡顶内的第四层、两端山墙和成组矩形窗。主入口朝院落，老图在这一侧画有凸出的门廊。",
    inferred: "屋脊和檐口高度、窗格尺寸按图像比例估计。背面缺少完整的同期视图。",
    source: "https://buildings.usst.edu.cn/2018/1002/c882a30388/page.htm",
    links: [
      [
        "科学馆旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/d5/c6/09475e354dabbbdc11718356280e/e5fbc17b-6773-43be-a826-50853348109d.png",
      ],
      [
        "科学馆手绘图",
        "https://buildings.usst.edu.cn/_upload/article/images/d5/c6/09475e354dabbbdc11718356280e/84eb78b0-850d-43dd-9574-87715de33ef2.jpg",
      ],
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  142: {
    observed:
      "1928年原馆有两层、陡坡顶、带窗的端山墙，以及长墙上窄而平顶的入口凸部。旧图有前后凸部，图书馆以东另一个空心轮廓属规划。",
    inferred: "入口凸部的深度依图估算，背面窗数与屋面色调待考。1948年动工的扩建另有年代记录。",
    source: "https://buildings.usst.edu.cn/2018/1002/c882a30389/page.htm",
    links: [
      campusHistories,
      [
        "原馆旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/f8/a0/98595bae4ef68001aeab3c456bde/ad271e67-f725-430f-a7dc-aa962e4e7fe1.png",
      ],
      [
        "1928年纪念册封面",
        "https://buildings.usst.edu.cn/_upload/article/images/f8/a0/98595bae4ef68001aeab3c456bde/2b112d84-c0be-478a-a1ef-b52b033c8ba6.png",
      ],
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  151: {
    observed: "图例151为助学社，在北住宅西端，平面图能辨相邻道路。",
    inferred: "入口、售货窗及屋面材料待考，暂取简单小铺的体量。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
  },
  152: {
    observed:
      "平面图在助学社与东堂之间标出狭长的北住宅。1934年鸟瞰可见此处的屋脊，东堂档案也记有学生住在北堂。",
    inferred: "水塔及邻屋遮住部分立面。层数、分间和侧窗按早期宿舍类型推定。",
    source: "https://buildings.usst.edu.cn/2018/1002/c882a30390/page.htm",
    links: [
      buildingChronicle,
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  153: {
    observed:
      "风灾前照片和手绘图可见山墙玫瑰窗、双联尖券和沿山墙布置的尖饰。南侧是组合柱门廊，东面有拱门。",
    inferred: "屋脊、烟囱尺寸及背立面窗列由旧照推定。四层楼的最上层融入坡屋顶。",
    source: "https://buildings.usst.edu.cn/2018/1001/c882a30383/page.htm",
    links: [
      campusHistories,
      [
        "风灾前旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/12/4e/c747f0144e27bdd67cc056d1e789/5d711b2b-9c87-4432-a3af-8fc733335bb9.png",
      ],
      [
        "思晏堂手绘图",
        "https://buildings.usst.edu.cn/_upload/article/images/12/4e/c747f0144e27bdd67cc056d1e789/31887249-1b76-4684-b508-6cc8c99b2abc.jpg",
      ],
      ["建筑史研究与图纸", "https://jss.usst.edu.cn/shlgdxxbsk/article/html/20200314"],
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  154: {
    observed:
      "图上在体育馆西侧。照片显示塔身分层、上段水箱大片实墙与齿形女儿墙。1937年8月的炮损晚于本场景。",
    inferred: "按旧照中的明暗差异将水箱外表处理为较浅的实墙。确切面层、色调与塔高待考。",
    source: "https://buildings.usst.edu.cn/2018/1004/c882a30409/page.htm",
    links: [
      [
        "水塔旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/81/62/b0100be54b209f51aa2088704c42/e7b2b642-bf81-4c0d-b4fd-41b8cb981d10.png",
      ],
      [
        "水塔手绘图",
        "https://buildings.usst.edu.cn/_upload/article/images/81/62/b0100be54b209f51aa2088704c42/1e4b1b19-0425-40cf-8b0b-baeb728003ed.png",
      ],
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  155: {
    observed: "电房占地为图上识别度较高的横向后勤用房，邻近通往体育馆的道路。",
    inferred: "设备开口、墙体高度和顶面按单层机房推定。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [["1923年《申报》校庆报道", "https://zh.wikisource.org/zh-hans/申報/1923/06/21#滬江之畢業禮及紀念會"]],
  },
  156: {
    observed: "图例156位于电房与油漆间之间，标作煤气房。",
    inferred: "编号覆盖主要轮廓，开口和墙体尺度均为近似。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
  },
  157: {
    observed: "图例157将油漆间标在后勤建筑组一端。",
    inferred: "底图标签覆盖部分外墙，门窗、屋面、分间尺度待考。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
  },
  161: {
    observed:
      "1918年竣工，1919年开馆。图上靠东堂的一段较窄，另一端扩为横翼。侧面旧照可数出五组高侧窗和逐层收进的扶壁，入口旧照可见中央山花和门洞。",
    inferred: "球场与横翼的宽度按阴影轮廓折算。屋顶坡度、彩色材料和照片未覆盖的后山墙细部为估计。",
    source: "https://buildings.usst.edu.cn/2018/1002/c882a30392/page.htm",
    links: [
      [
        "球场侧面旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/fc/3c/33117f90407ca63eb3edd647f8ad/365d4d24-7b1c-4bf1-8b3d-6aa5e6d5efdc.png",
      ],
      [
        "横翼入口旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/fc/3c/33117f90407ca63eb3edd647f8ad/de0a91e3-9327-4518-828f-d23643a52204.png",
      ],
      [
        "另一侧手绘图",
        "https://buildings.usst.edu.cn/_upload/article/images/fc/3c/33117f90407ca63eb3edd647f8ad/117a3134-5b80-4507-b2b9-1f6f1a6bdb8e.png",
      ],
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  162: {
    observed: "1922年秋建成。图上泳池沿图面横向紧靠东堂，体育馆的球场在池畔另一方向。",
    inferred: "只表现池体、水面与池沿，池深、栏杆样式和池岸材料缺少现场尺寸。",
    source: buildingChronicle[1],
    links: [
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  163: {
    observed:
      "早期照片可辨两层主体和横贯山墙的腰线。沿1934年鸟瞰图中的水塔、体育馆及泳池定位，东堂坡面已可见一排小窗；单体旧照能辨出六扇。",
    inferred: "屋顶加层的确切年份待考。临池以外一侧的窗数、入口位置、墙色和屋脊高度为推定。",
    source: "https://buildings.usst.edu.cn/2018/1002/c882a30390/page.htm",
    links: [
      [
        "东堂早期照片",
        "https://buildings.usst.edu.cn/_upload/article/images/e7/dc/2b78527c40888d7b8cf2e71ba97d/859303ae-225e-4410-8d78-e5c8c4c5834a.png",
      ],
      [
        "有老虎窗的旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/e7/dc/2b78527c40888d7b8cf2e71ba97d/c29c8a7a-55f2-4d78-96cc-07ffcac299c1.png",
      ],
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  164: {
    observed: "图例164标出大学印刷所，在游泳池附近。",
    inferred: "编号遮挡足迹，面积、层数与采光窗均作近似表现。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [buildingChronicle],
  },
  165: {
    observed: "图例165为工友膳厅，位于东堂近旁、泳池的另一侧。",
    inferred: "外轮廓局部受标号覆盖，门窗数量和屋面材料需要同期照片。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
  },
  166: {
    observed:
      "三层直墙上有陡坡顶，中央的入口山墙高出两侧。上下两层的窗在立面上竖向相连，南面八柱门廊托起露台。",
    inferred: "窗券曲率、柱头纹样及廊深没有测绘尺寸。取战前坡顶形制。",
    source: "https://buildings.usst.edu.cn/2018/1002/c882a30391/page.htm",
    links: [
      buildingChronicle,
      [
        "思裴堂旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/b3/ff/b7af718f4bbba66ac8f276f299c2/db525b6a-293f-48f4-8e6a-40283435c6b2.jpg",
      ],
      [
        "早期正面旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/b3/ff/b7af718f4bbba66ac8f276f299c2/e48cdb03-9293-4b59-b259-feaab2cc27b1.png",
      ],
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  167: {
    observed: "老照片可辨三层主体、密排老虎窗和中轴线上叠置的两层凸窗。1984年修缮时才改平顶。",
    inferred: "背坡开窗、窗下装饰、檐高及颜色按可见的正面推定。",
    source: "https://buildings.usst.edu.cn/2018/1002/c882a30393/page.htm",
    links: [
      [
        "思伊堂正面旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/0e/ba/a6710d14429b85cea0734b0787e4/13be0ea2-9da2-463e-b26f-9dafc800de08.png",
      ],
      [
        "另一张校园旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/0e/ba/a6710d14429b85cea0734b0787e4/41adf640-31aa-4733-b057-c9ff5cca659f.png",
      ],
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  168: {
    observed: "大学膳堂于1931年底建成。旧照显示两层长屋，屋面连贯，长墙为分组的矩形开窗。",
    inferred: "檐下饰带按照片明暗区分，背立面、表面颜色和入口尺寸为推定。",
    source: "https://buildings.usst.edu.cn/2018/1002/c882a30394/page.htm",
    links: [
      [
        "大学膳堂旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/7d/65/5234be7149979ec7ea5dec07549e/86e75d66-002e-4dc6-88c8-5846253eef7f.png",
      ],
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  180: {
    observed: "1937年图中明确标出四分之一英里跑道和运动场地。",
    inferred: "道宽、铺面和草地状态按运动场用途推定。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [
      buildingChronicle,
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  181: {
    observed: "1937年图例标出生物园，位于大学区与江岸之间。",
    inferred: "苗床、步径和植物品种为环境补景。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [campusHistories, ["沪江生物系与郑章成", "https://buildings.usst.edu.cn/2018/1002/c882a30388/page.htm"]],
  },
  182: {
    observed: "1937年图中可辨黄浦江岸与校园的相对位置。",
    inferred: "岸线高差、水位与对岸树木为环境补景。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [
      ["江边的思晏堂奠基礼", "https://buildings.usst.edu.cn/2018/1001/c882a30383/page.htm"],
      buildingChronicle,
      [
        "1934年鸟瞰照片（第11页）",
        "https://iso.usst.edu.cn/_upload/article/files/76/5c/5142c81c4eb1bc1f84aa015b2850/15cfc0b2-137d-4e9c-a7c6-f81d4431afc2.pdf#page=11",
      ],
    ],
  },
  190: {
    observed:
      "1916年校门和门房同时启用。旧照中可分辨高大的外门柱、一对较低的内门柱和铁栏，原址可由1937年图上的门房追认。",
    inferred: "石材色泽、题字位置、门扇开启角与门洞净宽为估计。1953年迁移、1992年放大改建均在此后。",
    source: "https://buildings.usst.edu.cn/2018/1002/c882a30395/page.htm",
    links: [
      [
        "原校门旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/54/1e/b4f1e8924dd08f71577e4e6519b1/192645f3-193c-43ee-92ec-41666588901d.png",
      ],
      [
        "1928年校门照片",
        "https://buildings.usst.edu.cn/_upload/article/images/54/1e/b4f1e8924dd08f71577e4e6519b1/c23a1315-95e4-499b-9647-72c0322d058c.png",
      ],
    ],
  },
  200: {
    observed: "最靠西的一处狭长合住房基，图中保留分户标记。",
    inferred: residenceByOutline,
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [["同期住宅类型参照", "https://buildings.usst.edu.cn/2018/1003/c882a30396/page.htm"]],
  },
  201: {
    observed: "接近西侧边路的一处横向长条住宅。",
    inferred: residenceByOutline,
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [buildingChronicle, ["同期住宅类型参照", "https://buildings.usst.edu.cn/2018/1003/c882a30396/page.htm"]],
  },
  202: {
    observed: "沿弯路略有偏转的窄住宅，图中线条较淡。",
    inferred: residenceByOutline,
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [["同期住宅类型参照", "https://buildings.usst.edu.cn/2018/1003/c882a30396/page.htm"]],
  },
  203: {
    observed: "前排主体较宽，后部较窄并居中接出。",
    inferred: residenceByOutline,
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [buildingChronicle, ["同期住宅类型参照", "https://buildings.usst.edu.cn/2018/1003/c882a30396/page.htm"]],
  },
  204: {
    observed: "主块后角多出一个较小的矩形。",
    inferred: residenceByOutline,
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [["同期住宅类型参照", "https://buildings.usst.edu.cn/2018/1003/c882a30396/page.htm"]],
  },
  205: {
    observed: "后段朝一侧收窄，临路一端较宽。",
    inferred: residenceByOutline,
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [["住宅区里的梅佩礼故居", "https://buildings.usst.edu.cn/2018/1003/c882a30396/page.htm"]],
  },
  206: {
    observed: "后排较窄的一翼与临路主体错开。",
    inferred: residenceByOutline,
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [["同期住宅类型参照", "https://buildings.usst.edu.cn/2018/1003/c882a30396/page.htm"]],
  },
  207: {
    observed: "后部带有折角窄翼，转折沿图描取。",
    inferred: residenceByOutline,
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [["同期住宅类型参照", "https://buildings.usst.edu.cn/2018/1003/c882a30396/page.htm"]],
  },
  208: {
    observed:
      "窄后翼与较宽前部相接；现校图33号与此处可按道路和邻屋比对。两处端山墙和中间门厅采用校长住宅旧照。",
    inferred: "具体落点由跨年代图件比对推定，1937年旧图以住宅分组标记；背立面和尺寸待考。",
    source: "https://buildings.usst.edu.cn/2018/1004/c882a30407/page.htm",
    links: [
      [
        "建筑旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/44/ae/041fd35a40108bb73d1837035255/08132cd5-30b3-4772-8c96-45afc2678672.png",
      ],
      ["校方校园图（定位参照）", "https://www.usst.edu.cn/xypmt/list.htm"],
    ],
  },
  209: {
    observed: "路弯旁独立，多处外墙有退进。修缮图能比对这里连续四宅和路口另三宅的布局。",
    inferred: residenceByGroup,
    source: "https://buildings.usst.edu.cn/2018/1003/c882a30403/page.htm",
    links: [
      [
        "同组住宅旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/22/62/7064741d420a8ee15ce81292fef9/96175a4e-61f2-46d7-881e-6c80724a67f7.png",
      ],
      ["校方修缮定位图", "https://xxgk.usst.edu.cn/2024/1205/c8492a331238/page.htm"],
    ],
  },
  210: {
    observed: "靠曲路一端的主体接两段错位小翼。修缮图能比对这里连续四宅和路口另三宅的布局。",
    inferred: residenceByGroup,
    source: "https://buildings.usst.edu.cn/2018/1003/c882a30402/page.htm",
    links: [
      [
        "同组住宅旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/b6/05/bcf5ed934752ae5bc89a322aced6/85fb5703-9115-4558-87c7-49e2f9a201f6.png",
      ],
      ["校方修缮定位图", "https://xxgk.usst.edu.cn/2024/1205/c8492a331238/page.htm"],
    ],
  },
  211: {
    observed: "前后宽度不同，后段折入一侧。修缮图能比对这里连续四宅和路口另三宅的布局。",
    inferred: residenceByGroup,
    source: "https://buildings.usst.edu.cn/2018/1003/c882a30401/page.htm",
    links: [
      [
        "同组住宅旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/94/ff/784514b54d1f8d599145f546795a/75ec6f79-612b-4237-a80a-2c6882fbe5ea.png",
      ],
      ["校方修缮定位图", "https://xxgk.usst.edu.cn/2024/1205/c8492a331238/page.htm"],
    ],
  },
  212: {
    observed: "靠三岔路的一所，后部有窄翼与凹角。修缮图能比对这里连续四宅和路口另三宅的布局。",
    inferred: residenceByGroup,
    source: "https://buildings.usst.edu.cn/2018/1003/c882a30400/page.htm",
    links: [
      [
        "同组住宅手绘图",
        "https://buildings.usst.edu.cn/_upload/article/images/11/eb/7ff47fdb4679a30af5666b54532d/f2f1d69b-9cc0-4a0d-9979-3e7a16063f17.png",
      ],
      ["校方修缮定位图", "https://xxgk.usst.edu.cn/2024/1205/c8492a331238/page.htm"],
    ],
  },
  213: {
    observed: "临路一段较宽，背后以短颈接窄翼。",
    inferred: residenceByOutline,
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [["同期住宅类型参照", "https://buildings.usst.edu.cn/2018/1003/c882a30396/page.htm"]],
  },
  214: {
    observed: "靠路住宅主块上接窄长后段。",
    inferred: residenceByOutline,
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [["同期住宅类型参照", "https://buildings.usst.edu.cn/2018/1003/c882a30396/page.htm"]],
  },
  215: {
    observed: "临路主体与细长后翼组合。",
    inferred: residenceByOutline,
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [["同期住宅类型参照", "https://buildings.usst.edu.cn/2018/1003/c882a30396/page.htm"]],
  },
  216: {
    observed: "紧邻大学部后勤区，街面宽、背后窄。",
    inferred: residenceByOutline,
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
    links: [["同期住宅类型参照", "https://buildings.usst.edu.cn/2018/1003/c882a30396/page.htm"]],
  },
  217: {
    observed: "靠路口的一所，主屋一侧伸出折角侧翼。修缮图能比对这里连续四宅和路口另三宅的布局。",
    inferred: residenceByGroup,
    source: "https://buildings.usst.edu.cn/2018/1003/c882a30399/page.htm",
    links: [
      [
        "同组住宅旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/a8/5a/6edf5bb8424cac90aa9d129291ff/81795fdc-3fce-471b-9557-682060bd7677.png",
      ],
      ["校方修缮定位图", "https://xxgk.usst.edu.cn/2024/1205/c8492a331238/page.htm"],
    ],
  },
  218: {
    observed: "主块与两段边翼围出向道路开口的小院。修缮图能比对这里连续四宅和路口另三宅的布局。",
    inferred: residenceByGroup,
    source: "https://buildings.usst.edu.cn/2018/1003/c882a30398/page.htm",
    links: [
      [
        "同组住宅旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/c0/60/14b3553c46bc9773a343fba39d02/d4a7c70d-5b62-4fb8-99d8-19f9bbb5e5c6.png",
      ],
      ["校方修缮定位图", "https://xxgk.usst.edu.cn/2024/1205/c8492a331238/page.htm"],
    ],
  },
  219: {
    observed: "一侧形成较长侧翼，图上可辨数次凹凸。修缮图能比对这里连续四宅和路口另三宅的布局。",
    inferred: residenceByGroup,
    source: "https://buildings.usst.edu.cn/2018/1003/c882a30397/page.htm",
    links: [
      [
        "同组住宅旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/af/73/4714fe074f108f281408b179d38a/27edb3ea-2f52-4b2c-b2c7-0e3d4d18a8ce.png",
      ],
      ["校方修缮定位图", "https://xxgk.usst.edu.cn/2024/1205/c8492a331238/page.htm"],
    ],
  },
  220: {
    observed:
      "靠大礼堂及沿路的长条基底；与现校图35号、周边住宅和礼堂可作相对定位。旧照中可见一大一小两座山墙及石栏阳台。",
    inferred: "具体落点由跨年代图件比对推定，1937年旧图以住宅分组标记；背立面和尺寸待考。",
    source: "https://buildings.usst.edu.cn/2018/1004/c882a30412/page.htm",
    links: [
      [
        "建筑旧照",
        "https://buildings.usst.edu.cn/_upload/article/images/9b/ca/ad1e990642a1859709f512716c9c/598d2c70-51cf-4c5d-a058-c26e8df66e32.png",
      ],
      ["校方校园图（定位参照）", "https://www.usst.edu.cn/xypmt/list.htm"],
    ],
  },
  230: {
    observed: "住宅后侧边界的实有建筑阴影，可与1937年平面图的实有建筑图例对照。",
    inferred: "图例未逐一注明它的名称与用途。暂作低矮附屋表现，材料、开口和高度待考。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
  },
  231: {
    observed: "住宅后侧边界的实有建筑阴影，可与1937年平面图的实有建筑图例对照。",
    inferred: "图例未逐一注明它的名称与用途。暂作低矮附屋表现，材料、开口和高度待考。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
  },
  232: {
    observed: "住宅后侧边界的实有建筑阴影，可与1937年平面图的实有建筑图例对照。",
    inferred: "图例未逐一注明它的名称与用途。暂作低矮附屋表现，材料、开口和高度待考。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
  },
  233: {
    observed: "住宅后侧边界的实有建筑阴影，可与1937年平面图的实有建筑图例对照。",
    inferred: "图例未逐一注明它的名称与用途。暂作低矮附屋表现，材料、开口和高度待考。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
  },
  234: {
    observed: "住宅后侧边界的实有建筑阴影，可与1937年平面图的实有建筑图例对照。",
    inferred: "图例未逐一注明它的名称与用途。暂作低矮附屋表现，材料、开口和高度待考。",
    source: "https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm",
  },
};
for (const s of sites) {
  s.record = buildingRecords[s.id];
  s.source = s.record.source;
}
