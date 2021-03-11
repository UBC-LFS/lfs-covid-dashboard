/*
This is a script that docker will run while initializing mongodb to create a user that can read/write to the records database

Update AdminUsername, AdminPassword, RecordsUsername, RecordsPassword with desired credentials before running project on docker
*/

db.auth("AdminUsername", "AdminPassword");

db = db.getSiblingDB("records");

db.createUser({
  user: "RecordsUsername",
  pwd: "RecordsPassword",
  roles: [
    {
      role: "readWrite",
      db: "records",
    },
  ],
});
