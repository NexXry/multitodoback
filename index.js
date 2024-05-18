import mysql from "mysql";
import {body, validationResult} from "express-validator";
import bodyParser from "body-parser";
import express from "express";
import bcrypt from "bcrypt";

var app = express();
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "todomulti"
});


app.listen(8000, () => {
    console.log("Server running on port 8000");
});


app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

app.get("/users",async (req, res, next) => {
    console.log(hashPassword("qsdsqqs"))
    con.connect(function(err) {
        if (err) throw err;
        con.query("SELECT * FROM users", function (err, result, fields) {
            if (err) throw err;
            res.json(result);
        });
    });
});

app.post("/users",[
    body('username').trim().isAlphanumeric().escape(),
    body('email').trim().isAlphanumeric().escape(),
    body('password').trim().isAlphanumeric().escape(),
], (req, res, next) => {
    const { username,email,password } = req.body

    bcrypt.hash(username, 10, (err, hash) => {
        if (err) {
            return;
        }
        con.connect(function(err) {
            if (err) throw err;
            con.query("INSERT INTO users (username,email,password) VALUES (?,?,?)",[username,email,hash], function (err, result, fields) {
                if (err) throw err;+
                res.json(result);
            });
        });
    });


});

