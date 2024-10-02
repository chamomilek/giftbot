#!/bin/bash

echo "Creating database"
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME; GRANT ALL PRIVILEGES ON $DB_NAME.* TO 'root'@'%'; FLUSH PRIVILEGES;"
sleep 60

mysql -u root -p$MYSQL_ROOT_PASSWORD $DB_NAME <<EOF

CREATE TABLE IF NOT EXISTS game (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chat_id BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
    id INT PRIMARY KEY AUTO_INCREMENT, 
    username VARCHAR(255) NOT NULL,     
    game_id INT,
    FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE                   
);

CREATE TABLE IF NOT EXISTS winners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT,
    participant_id INT,
    winner_rank INT, 
    FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);


ALTER TABLE participants
ADD CONSTRAINT fk_game_participants FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;
EOF
echo "Database and table was created successfully"

echo "Restoring database from seed"
# mysql -u root -p$MYSQL_ROOT_PASSWORD $DB_NAME < /docker-entrypoint-initdb.d/seed-db.dump
