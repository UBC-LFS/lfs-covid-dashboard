db.auth(process.env.MONGO_ROOT_USERNAME, process.env.MONGO_ROOT_PASSWORD)

db = db.getSiblingDB('records')

db.createUser(
  {
      user: process.env.MONGO_ROOT_USERNAME,
      pwd: process.env.MONGO_ROOT_PASSWORD,
      roles: [
          {
              role: "readWrite",
              db: "records"
          }
      ]
  }
);