const { validationResult } = require("express-validator");
const User = require("../models/user")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.signUpUser = (req, res, next) => {
    const errors = validationResult(req);
    //Mudar esta validação para um captar no app
    //use, em todas as requisições!
    if (!errors.isEmpty()) {
        //Criei um objeto do tipo ERROR e adicionei (com os nomes que escolhi)
        //mais duas propriedades: data e statusCode
        const error = new Error("Falha de validação");
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    //A senha está sendo salva em formato texto!!!
    //um problema!! Salvar ela criptografada!
    bcrypt.hash(password, 12).then(passHashed => {
        //Add este post ao DB
        const user = new User({
            email: email,
            name: name,
            password: passHashed,
        })

        user.save()
            .then(user => {

                user.password = undefined; // para nao devolver a senha
                res.status(201).json({
                    message: "User criado com sucesso!!",
                    result: user
                })
            }).catch(error => {
                res.status(500).json({
                    message: "Error ao salvar o user...",
                    result: error
                })
            })
    })
}
exports.signInUser = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;
    //Buscar user na base de dados com o email enviado
    await User.findOne({ email: email })
        .then(user => { //user é o que ele retorna
            //validar que email não existe na base
            console.log(user)
            if (!user) {
                const error = new Error("Falha de validação");
                error.statusCode = 422;
                throw error;
            }
            loadedUser = user;
            return bcrypt.compare(password, user.password);
        }).then(passIsEqual => {
            if (!passIsEqual) {
                const error = new Error("Email ou senha inválida...");
                error.statusCode = 401;
                throw error;
            }

            //Vamos gerar o token para ele!
            const token = jwt.sign(
                {
                    email: loadedUser.email,
                    userId: loadedUser._id.toString()
                },
                "MinhaChaveJWT@2024Senai",
                { expiresIn: "4h" }
            )

            return res.status(200).json({
                message: "Usuário logado com sucesso!",
                token: token,
            })
        })
        .catch(error => {
            console.log(error)
            if (!error.statusCode) {
                error.statusCode = 500;
            }
            next(error);
        })
}
