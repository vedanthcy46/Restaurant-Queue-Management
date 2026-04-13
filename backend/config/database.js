const { open } = require('sqlite');
const Database = require('better-sqlite3');
const db = new Database('/data/database.db');
const path = require('path');


const initializeDB = async () => {
    db = await open({
        filename: path.join(__dirname, '../restaurant.db'),
        driver: sqlite3.Database
    });
    return db;
};

const getDB = () => db;

module.exports = { initializeDB, db: getDB };
