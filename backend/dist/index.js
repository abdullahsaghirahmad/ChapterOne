"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const book_routes_1 = require("./routes/book.routes");
const thread_routes_1 = require("./routes/thread.routes");
const user_routes_1 = require("./routes/user.routes");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 3001;
// Middleware
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Routes
app.use('/api/books', book_routes_1.bookRouter);
app.use('/api/threads', thread_routes_1.threadRouter);
app.use('/api/users', user_routes_1.userRouter);
// Initialize database connection
database_1.AppDataSource.initialize()
    .then(() => {
    console.log('Database connection established');
    // Start server
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
})
    .catch((error) => {
    console.error('Error during Data Source initialization:', error);
});
