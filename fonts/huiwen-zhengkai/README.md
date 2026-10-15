# 汇文正楷 · 首页姓名字形

作者：特里王（TerryWang）。原字体版本：1.001。

- 作者网站：https://huozi.cool/
- 原字体：https://huozi.cool/newfonts/HWZHENGKAI.ttf
- 作者授权：https://huozi.cool/api/license-config
- 原始文件 SHA-256：`c5597407e8ebec614f75c649da9d2b959c3ff8db9a5fa07ded3818e2a0e7d109`

本目录只保留「韩兆令」三个简体字的 WOFF2 子集，用于网页姓名展示；字形轮廓、字宽与原字体元数据保持不变。字体随站点加载，无须读者安装字体，也不依赖第三方字体服务。

## 授权记录

2026-10-13，作者官网将「汇文正楷」列在「免商可修改」类别，其说明为：

> 免费商用，允许修改字体，支持全媒体、电商、嵌入式、出版等场景。

原文件版权与使用声明保留在字体元数据及 `NOTICE.txt` 中。此处不将作者的许可替换为 OFL 或其他许可证。

## 重建

安装 fontTools 与 Brotli 后，在仓库根目录运行：

```sh
python scripts/subset-profile-huiwen.py /path/to/HWZHENGKAI.ttf
```
