const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_KEY);

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
const paymentCollection = client.db('assetsManagement').collection('payments');

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

        const isExist = await usersCollection.findOne({
          email: data.email,
        });

        if (isExist) {
          res.send({ message: 'User Already Exist' });
          return;
        }
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
        const { HR_id, members } = req.body;
        const { id } = req.params;
        const updateField = {};
        const query = { _id: new ObjectId(id) };

        const fieldToCheck = ['companyName', 'name', 'dateOfBirth', 'package'];

        fieldToCheck.forEach((field) => {
          if (req.body[field] !== undefined) {
            updateField[field] = req.body[field];
          }
        });

        // if (companyName !== undefined) {
        //   updateField.companyName = companyName;
        // }

        // console.log('companyName', companyName);

        // if (name !== undefined) {
        //   updateField.name = name;
        // }
        // if (dateOfBirth !== undefined) {
        //   updateField.dateOfBirth = dateOfBirth;
        // }

        const memberCount = await usersCollection.updateOne(
          { _id: new ObjectId(HR_id) },
          {
            $set: { members },
          }
        );

        const updateDoc = {
          $set: updateField,
        };
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send({ result, memberCount });
      } catch (error) {
        console.log(error);
      }
    });

    //request for an assets

    app.get('/requestForAsset', async (req, res) => {
      try {
        const {
          email,
          companyName,
          requestStatus,
          assetType,
          search,
          searchUser,
        } = req.query;
        const query = {};

        // console.log(searchUser);

        if (email) {
          query.email = email;
        }

        // console.log(email);
        if (companyName) {
          query.companyName = companyName;
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
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const updateField = {};

        // Define the fields you want to handle dynamically
        // const fieldsToCheck = ['approvalDate', 'status'];

        // fieldsToCheck.forEach((field) => {
        //   if (req.body[field] !== undefined) {
        //     updateField[field] = req.body[field];
        //   }
        // });
        const { approvalDate, status, productName } = req.body;
        // const { id } = req.params;
        // const updateField = {};

        // console.log(productName);

        if (approvalDate) {
          updateField.approvalDate = approvalDate;
        }

        if (status) {
          updateField.status = status;
        }

        const updateDoc = {
          $set: updateField,
        };

        // const up = {
        //   $set: updateField,
        // };

        const product = await allAssetsCollection.findOne({ productName });

        if (status === 'Approved') {
          updateField.quantity = product?.quantity - 1;
        }
        if (status === 'Returned') {
          updateField.quantity = product?.quantity + 1;
        }

        const updateProductQuantity = await allAssetsCollection.updateOne(
          {
            productName,
          },
          updateDoc
        );

        // const query = { _id: new ObjectId(id) };

        const result = await requestCollection.updateOne(query, updateDoc);
        res.send({ result, updateProductQuantity });
      } catch (error) {
        console.log(error);
      }
    });

    app.delete('/requestForAsset/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };

        const result = await requestCollection.deleteOne(query);
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
      try {
        const { email, companyName } = req.query;
        const query = {};

        if (email.length) {
          query.email = email;
        }

        if (companyName) {
          query.companyName = companyName;
        }

        // console.log(email);

        const result = await customRequestCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.patch('/custom-request/:id', async (req, res) => {
      try {
        const updateField = {};
        // const {
        //   assetName,
        //   imageUrl,
        //   info,
        //   price,
        //   requestDate,
        //   type,
        //   whyNeedThis,
        //   status,
        // } = req.body;
        // console.log(req.body);
        const { id } = req.params;

        const query = { _id: new ObjectId(id) };
        const fieldsToCheck = [
          'assetName',
          'imageUrl',
          'info',
          'price',
          'requestDate',
          'approvalDate',
          'type',
          'whyNeedThis',
          'status',
        ];

        fieldsToCheck.forEach((field) => {
          if (req.body[field] !== undefined) {
            updateField[field] = req.body[field];
          }
        });

        const updateDoc = {
          $set: updateField,
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
        const { sort, assetType, stockStatus, search, email, limitedItem } =
          req.query;
        const options = { sort: { quantity: sort === 'asc' ? 1 : -1 } };

        // console.log('email', email);
        const query = {};
        // console.log(limitedItem);

        if (email !== 'undefined') {
          query.hrEmail = email;
        }

        if (limitedItem) {
          query.quantity = { $gt: 0, $lt: 10 };
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

    app.patch('/allAsset/:id', async (req, res) => {
      try {
        const { quantity, date } = req.body;
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };

        const result = await allAssetsCollection.updateOne(query, {
          $set: { quantity, date },
        });

        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.delete('/allAsset/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };

        const result = await allAssetsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    //payment Intent
    app.post('/create-payment-intent', async (req, res) => {
      try {
        const { price } = req.body;
        const amount = parseInt(price * 100);
        // console.log(amount);

        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: 'usd',
          payment_method_types: ['card'],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.log(error);
      }
    });

    app.post('/payments', async (req, res) => {
      try {
        const { payment, id, members } = req.body;
        const result = await paymentCollection.insertOne(payment);

        const query = { _id: new ObjectId(id) };
        const updateHR = await usersCollection.updateOne(query, {
          $set: { package: '', payment: 'complete', members },
        });

        res.send({ result, updateHR });
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
