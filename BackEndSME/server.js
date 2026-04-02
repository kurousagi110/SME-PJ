import express from 'express'
import cors from 'cors'
import { swaggerUi, swaggerSpec } from './swagger.js'

import usersRoutes from "./routes/user.router.js";
import nguyenLieuRoutes from "./routes/nguyenlieu.route.js";
import sanPhamRoutes from "./routes/sanPham.route.js";
import donHangRoutes from "./routes/donHang.route.js";
import phongban_chucvuRoutes from "./routes/phongban_chucvu.route.js";
import luongRoutes from "./routes/luong.route.js";
import bomRoutes from "./routes/bom.route.js";
import dashbroadRoutes from "./routes/dashboardRoutes.js";



const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  console.log(req.headers)
  res.send('<h1>Welcome to back-end SME project</h1>')
})
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))


app.use("/api/users", usersRoutes);
app.use("/api/nguyen-lieu", nguyenLieuRoutes);
app.use("/api/san-pham", sanPhamRoutes);
app.use("/api/don-hang", donHangRoutes);
app.use("/api/phongban-chucvu", phongban_chucvuRoutes);
app.use("/api/luong", luongRoutes);
app.use("/api/bom", bomRoutes);
app.use("/api/dashboard", dashbroadRoutes);

export default app