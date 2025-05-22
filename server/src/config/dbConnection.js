const mongoose = require('mongoose');

const dbConnection = async()=>{
    try{
        const connect = await mongoose.connect(process.env.DB_CONNECTION_STRING);
        console.log(`Database connected! Host:${connect.connection.host} Database:${connect.connection.name}`);

    }catch(error){
        console.log(error);
        process.exit(1);
    }
}

module.exports = dbConnection;