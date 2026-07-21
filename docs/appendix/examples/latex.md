---
order: 3
---

# LaTeX 数学公式示例

本页验证 `@mdit/plugin-katex`（KaTeX）是否生效。

## 行内公式

当 $a \ne 0$ 时，方程 $ax^2 + bx + c = 0$ 的解为：

## 块级公式

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

## 欧拉恒等式

$$
e^{i\pi} + 1 = 0
$$

## 矩阵

$$
\begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}
\cdot
\begin{pmatrix}
x_1 \\ x_2 \\ x_3
\end{pmatrix}
=
\begin{pmatrix}
14 \\ 32 \\ 50
\end{pmatrix}
$$

## 求和与积分

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

## 分段函数

$$
f(x) = \begin{cases}
x^2, & x \geq 0 \\
-x, & x < 0
\end{cases}
$$

如果你看到上面所有公式都被正常渲染（而不是看到 `$` 或 `$$` 源码），说明 LaTeX 插件工作正常。
