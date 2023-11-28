const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//assetsManagement QRMqknmKLzBH85kG

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kfd97zi.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const usersCollection = client.db('assetsManagement').collection('users');
const allAssetsCollection = client
  .db('assetsManagement')
  .collection('allAssets');
const customRequestCollection = client
  .db('assetsManagement')
  .collection('customRequest');
const requestCollection = client
  .db('assetsManagement')
  .collection('requestAsset');

async function run() {
  try {
    app.get('/users', async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.post('/users', async (req, res) => {
      try {
        const data = req.body;
        const result = await usersCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get('/users/HR/:email', async (req, res) => {
      try {
        const { email } = req.params;
        const query = { email };
        const result = await usersCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.patch('/users/:id', async (req, res) => {
      try {
        const { companyName, name, dateOfBirth } = req.body;
        const { id } = req.params;
        const updateField = {};

        const query = { _id: new ObjectId(id) };

        if (companyName !== undefined) {
          updateField.companyName = companyName;
        }
        if (name !== undefined) {
          updateField.name = name;
        }
        if (dateOfBirth !== undefined) {
          updateField.dateOfBirth = dateOfBirth;
        }
        const updateDoc = {
          $set: updateField,
        };
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //request for an assets

    app.get('/requestForAsset', async (req, res) => {
      try {
        const { email, requestStatus, assetType, search, searchUser } =
          req.query;
        const query = {};
        if (email) {
          query.email = email;
        }

        if (searchUser.length) {
          query.$or = [
            { email: { $regex: searchUser, $options: 'i' } },
            { name: { $regex: searchUser, $options: 'i' } },
          ];
        }

        if (requestStatus === 'Pending' || requestStatus === 'Approved') {
          query.status = requestStatus;
        }

        if (search.length) {
          query.assetName = { $regex: search, $options: 'i' };
        }

        if (assetType === 'Returnable' || assetType === 'Non-returnable') {
          query.type = assetType;
        }

        const result = await requestCollection.find(query).toArray();
        res.send(result);

        // const result = await requestCollection.find().toArray();
        // res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.post('/requestForAsset', async (req, res) => {
      try {
        const data = req.body;
        const result = await requestCollection.insertOne(data);

        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.patch('/requestForAsset/:id', async (req, res) => {
      try {
        const { approvalDate } = req.body;
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: 'Approved',
            approvalDate,
          },
        };

        const result = await requestCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //custom request assets
    app.post('/custom-request', async (req, res) => {
      try {
        const data = req.body;
        const result = await customRequestCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get('/custom-request', async (req, res) => {
      //   const { status } = req.params;
      //   const query = { status };
      try {
        const result = await customRequestCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.patch('/custom-request/:id', async (req, res) => {
      try {
        const {
          assetName,
          imageUrl,
          info,
          price,
          requestDate,
          type,
          whyNeedThis,
          status,
        } = req.body;
        console.log(req.body);
        const { id } = req.params;
        console.log(id);
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            assetName,
            imageUrl,
            info,
            price,
            requestDate,
            type,
            whyNeedThis,
            status,
          },
        };
        const result = await customRequestCollection.updateOne(
          query,
          updateDoc
        );

        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //all assets
    app.get('/allAssets', async (req, res) => {
      try {
        const { sort, assetType, stockStatus, search, email } = req.query;
        const options = { sort: { quantity: sort === 'asc' ? 1 : -1 } };

        const query = {};

        if (email) {
          query.hrEmail = email;
        }

        if (stockStatus === 'Available') {
          query.quantity = { $gt: 1 };
        } else if (stockStatus === 'Out-of-stock') {
          query.quantity = 0;
        }

        if (search.length) {
          query.productName = { $regex: search, $options: 'i' };
        }

        if (assetType === 'Returnable' || assetType === 'Non-returnable') {
          query.type = assetType;
        }

        const result = await allAssetsCollection.find(query, options).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.post('/allAssets', async (req, res) => {
      try {
        const data = req.body;
        const result = await allAssetsCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('assets management server is running');
});

app.listen(port, () => {
  console.log(`assets management server is running :${port}`);
});
