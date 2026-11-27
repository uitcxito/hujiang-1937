# 沪江大学 1937 模型与复原依据

校园坐标以米计。Blender 源码沿用原导览地点的局部坐标，导出 Y 向上的 glTF 2.0。三栋建筑均有独立 GLB。每种树的 GLB 内各有三株完整的木质骨架和带叶小枝，可在 Blender 中逐株查看。

## 建筑依据与尺度

| 地点 | 有史料依据的构造 | 模型尺寸的取法 |
| --- | --- | --- |
| 121 大礼堂暨思魏堂 | 礼堂东西向，与北侧思魏堂组成曲尺平面。入口有双联扁拱、厚墙线脚，长侧墙既有高窗也有小圆窗。两翼山墙的大窗分格不同。 | 保留既有复原的礼堂主体 31 × 15 米，檐高 10.4 米。北翼约 15.05 × 13.45 米。两翼交接、窗洞进深、台阶和门扇按照片比例推定。[档案图说](https://buildings.usst.edu.cn/2018/1002/c882a30387/page.htm) · [旧照](https://buildings.usst.edu.cn/_upload/article/images/89/d5/89b1bbd24a3190a50830cb3c9e23/f39b9deb-a650-4e93-8068-f25ea718b2ac.png) |
| 153 思晏堂 | 风灾前为四层，第四层融入坡顶。南侧有组合柱廊，东面有拱门、玫瑰窗，立面另有双联尖券、扶壁和尖饰。 | 沿用老图上约 26.5 × 16.4 米的描线占地。柱径、雕饰、坡度、烟囱和背立面按旧照推定。[校档案馆](https://buildings.usst.edu.cn/2018/1001/c882a30383/page.htm) · [风灾前照片](https://buildings.usst.edu.cn/_upload/article/images/12/4e/c747f0144e27bdd67cc056d1e789/5d711b2b-9c87-4432-a3af-8fc733335bb9.png) |
| 190 密氏校门 | 保留老图门房旁的入口、两高两低的石柱和铁栏。门柱采用分层石座、压顶和顶饰。 | 内柱中心距沿用 6.6 米。门扇向校内开启，开度、石料色泽和题字位置为推定。取 1953 年迁址前的形制。1992 年改建时放大了 1.23 倍。[校档案馆](https://buildings.usst.edu.cn/2018/1002/c882a30395/page.htm) · [原门照片](https://buildings.usst.edu.cn/_upload/article/images/54/1e/b4f1e8924dd08f71577e4e6519b1/192645f3-193c-43ee-92ec-41666588901d.png) |

以上长度来自图上描线与既有模型。归一化校图采用每像素 0.4826 米的估算比例。档案中的建筑面积另有定义，未用作占地或单边实测值。[1937 年校园平面图](https://dag.usst.edu.cn/2025/0527/c14228a342128/page.htm)

窗洞的石窗台伸至玻璃后方，侧壁和拱顶收至窗框。礼堂与思魏堂各按入口标高设置室内地板，两翼之间保留露天院落。地板高度随模型门槛推定。

## 初夏树木

| 树种 | 基础形态 | 识别细节与在场景中的证据 |
| --- | --- | --- |
| 香樟 | 低干展冠、高干圆冠、偏冠斜干 | 长枝外展，宽冠，卵形全缘叶，成年树皮有纵裂。校史记录支持园内曾有香樟，单株位置和树龄仍属推定。[校友会的校园香樟记录](https://alumni.usst.edu.cn/2009/0701/c2366a45894/page.htm) |
| 榉树 | 高位帚冠、低叉扇冠、窄冠直立 | 主枝向上分叉，较浅的斑驳树皮，叶缘有锯齿。作为上海地区的解释性补景。[上海数字植物志](https://shflora.ibiodiversity.net/Pages/Zelkova_serrata.html) |
| 三角枫 | 多干层冠、高干疏冠、低位偏冠 | 树冠分层，细枝、对生三裂叶和较平滑的树皮在步行距离可见。初夏采用绿叶。作为解释性补景。[上海数字植物志](https://shflora.ibiodiversity.net/Pages/Acer_buergerianum.html) |

每株按地图坐标生成固定种子。种子选择枝架，改变冠幅、朝向、倾斜和不同方向的上部枝条展开角。进退、升空和切换画质时，主干、枝梢、叶簇和投影一直使用同一套三维网格与单株变形。相机视野之外的林块可跳过绘制。水杉未列入校园种植清单。

当细叶在远处小于一个像素时，材质按叶图的像素覆盖率采样。枝叶、玻璃中的倒影和地面投影共用这种处理，让远景仍能读出树冠的疏密。

沿用基线的 519 个布置点，调整了礼堂西门正前方一株的位置以让出双联入口，并在北侧林带补植三株。道路中心线和两翼占地取自原校图。礼堂路肩的碎石、稀草和林下裸土属于环境补景。

## 来源与授权范围

| 资源 | 来源与许可 | 使用范围 |
| --- | --- | --- |
| 三栋建筑、九个树形、枝叶、砖石、瓦面、树形图鉴和入口门扇 | 本项目原创。原创部分仅授权随沪江大学 1937 校园项目展示与分发。单独提取或用于其他项目，须另行获得授权。 | 离线漫游、项目网站及本项目的对照图。 |
| 香樟树皮的颜色与法线 | 复用仓库已收录的 Poly Haven 扫描，CC0 1.0。[Bark Brown 02](https://polyhaven.com/a/bark_brown_02) · [许可](https://polyhaven.com/license) | 嵌入香樟 GLB。原扫描继续按 CC0 使用。 |
| 门柱“滬江大學”四字 | 取 Noto Serif CJK SC Regular 的栅格字形，字体按 SIL Open Font License 1.1 分发。[字体与许可](https://github.com/notofonts/noto-cjk/tree/main/Serif) | 门牌纹理，模型内仅含像素。 |
| GLTFLoader 与所用的 BufferGeometryUtils | Three.js r160，MIT，沿用项目内的 Three.js 实例。[上游 r160 源码](https://github.com/mrdoob/three.js/blob/r160/examples/jsm/loaders/GLTFLoader.js) · [本地许可](../vendor/THREE-LICENSE.txt) | 本地经典脚本，开发入口与离线版共用。 |
| 历史平面图、建筑照片与植物志 | 上列各原始资料页，权利归各来源。 | 用于核对轮廓、构造和植物形态。发布包中的图像为本项目渲染截图。 |

## 复建

直接打开仓库中的 `hujiang.html` 即可离线漫游。日常打包只需在仓库根目录执行 `node build.cjs`。它校验六个 GLB 的文件头和长度，将压缩后的模型和所有脚本内嵌。开发入口也从本地资源脚本解析字节。

改动美术源后，准备 Blender 4.5.9 LTS、带 Pillow 和 NumPy 的 Python、Node.js、Playwright 与浏览器。将 `HUJIANG_CJK_FONT` 设为 NotoSerifCJKsc-Regular.otf 的完整路径。下面的 `texture-work` 是可自行指定的中间目录。

```sh
python art/textures.py texture-work
blender --background --factory-startup --python-exit-code 1 --python art/export.py -- texture-work assets/models
node build.cjs
```

执行 `node tools/render-tree-gallery.cjs` 可从 GLB 重新拍摄九株树形与叶形图鉴。五组新旧截图的固定机位和复拍命令见[美术验收](../验收/美术升级/README.md)。
