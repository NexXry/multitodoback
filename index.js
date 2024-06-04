import mysql from 'mysql';
import { body, validationResult } from 'express-validator';
import bodyParser from 'body-parser';
import express from 'express';
import bcrypt from 'bcrypt';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from "jsonwebtoken";
import 'dotenv/config'

const SECRET_KEY = process.env.SECRET_KEY;

var app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        allowedHeaders: ['Content-Type'],
    }
});

const corsOptions = {
    origin: 'http://localhost:5173',
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "todomulti"
});

con.connect(function(err) {
    if (err) throw err;
    console.log('Connected to MySQL database');
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('foo', (msg) => {
        con.query("INSERT INTO tasks (task, done, user_id) VALUES (?, ?, ?)", [msg.task, msg.done,msg.user_id], function(err, result) {
            if (err) {
                console.log(err);
            }
        });

        io.emit('foo', msg);
    });

    socket.on('removeTask', (id) => {
        con.query("DELETE FROM tasks WHERE id = ?", [id], function(err, result) {
            if (err) {
                console.log(err);
            }
        });
        io.emit('removeTask', id);
    })

    con.query("SELECT tasks.id as taskId,users.id as user_id,users.username, tasks.task,tasks.done FROM tasks,users where users.id = tasks.user_id", function(err, result) {
        if (err) {
            console.log(err);
        }
        let tasks = result.map((task) => {
            return {
                id: task.taskId,
                task: task.task,
                done: task.done,
                user_id: task.user_id,
                user: task.username
            }
        })
        socket.emit('tasks', tasks);
    })

});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post("/users", [
    body('username').trim().isAlphanumeric().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').trim().isLength({ min: 5 }).escape(),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        con.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hash], function(err, result) {
            if (err) {
                return res.status(500).json({ error: 'Database Insertion Error' });
            }
            res.json({ message: 'User created successfully', result });
        });
    });
});

app.post("/login",[
    body('username').trim().isAlphanumeric().escape(),
    body('password').trim().isLength({ min: 5 }).escape(),
], (req,res)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username,  password } = req.body;

    //check in database of username and hashed password is same
    con.query("SELECT * FROM users WHERE username = ?", [username], function(err, result) {
        if (err) {
            return res.status(500).json({ error: 'Database Insertion Error' });
        }
        if(result.length === 0){
            return res.status(404).json({ error: 'User not found' });
        }
        bcrypt.compare(password, result[0].password, (err, same) => {
            if (err) {
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            if (!same) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const expireIn = 24 * 60 * 60;

            const token    = jwt.sign({
                id: result[0].id,
                username: result[0].username,
                },
                SECRET_KEY);

            res.json({ token:token  });
        });
    });
})

server.listen(8000, () => {
    console.log("Server running on port 8000");
});

