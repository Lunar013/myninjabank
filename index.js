const express = require('express');
const Airtable = require('airtable');
const path = require('path');
const session = require('express-session');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

Airtable.configure({
  apiKey: process.env.AIRTABLE_API_KEY
});

const base = Airtable.base(process.env.AIRTABLE_BASE_ID);

app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'myNinjaSecretKey', // change this to something unique
  resave: false,
  saveUninitialized: true
}));

// Serve static files like CSS
app.use(express.static(path.join(__dirname, 'public')));

// Login Page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>My Ninja Bank</title>
        <link rel="icon" type="image/png" href="/favicon.png">
        <style>
          body {
            font-family: 'Segoe UI', sans-serif;
            background-color: #f0f4ff;
            color: #333;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          h1 {
            color: #2b6cb0;
          }
          form {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          input {
            padding: 10px;
            font-size: 16px;
            margin: 10px;
            border: 2px solid #2b6cb0;
            border-radius: 5px;
          }
          button {
            background-color: #2b6cb0;
            color: white;
            padding: 10px 20px;
            font-size: 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
      <img src="https://www.kcstem.org/wp-content/uploads/2018/10/Code_Ninjas_Color_Vertical-300x136.png" alt="My Ninja Bank Logo" style="max-width: 200px; margin-bottom: 20px;" />
        <h1>Welcome to My Ninja Bank!</h1>
        <form action="/coins" method="POST">
          <label for="ninjaCode">Enter Your Ninja Code:</label>
          <input type="text" name="ninjaCode" required />
          <button type="submit">See my coins </button>
        </form>
                <br />
        <a href="/sensei-login">Sensei Login</a>
      </body>
    </html>
  `);
});

// Coin Breakdown Page
app.post('/coins', async (req, res) => {
  const ninjaCode = req.body.ninjaCode;

  try {
    // Get Ninja Record
    const ninjaRecords = await base('Ninjas').select({
      filterByFormula: `{Login Info} = '${ninjaCode}'`
    }).firstPage();

    if (ninjaRecords.length === 0) {
      return res.send(`<p style="text-align: center;">Ninja not found. <a href="/">Go back</a></p>`);
    }

    const ninja = ninjaRecords[0];
    const ninjaName = ninja.fields.Name || 'Ninja';
    const totalCoins = ninja.fields.Coins || 0;

    // Convert to Obsidian/Gold/Silver
    const obsidian = Math.floor(totalCoins / 25);
    const remainingAfterObsidian = totalCoins % 25;
    const gold = Math.floor(remainingAfterObsidian / 5);
    const silver = remainingAfterObsidian % 5;

    // Get Transactions
    const transactions = await base('Transactions').select({
      filterByFormula: `{Login Info} = '${ninjaCode}'`,
      sort: [{ field: "Date", direction: "desc" }]
    }).all();

  let transactionRows = transactions.map(t => {
  const date = t.fields.Date || 'Unknown';
  const type = t.fields["Transaction Type"] || 'Unknown';
  const amount = t.fields.Amount || 0;
  const reason = t.fields.Reason || '';

  // Normalize type for class usage
  const typeClass = type.toLowerCase().replace(/\s+/g, '');

  return `<tr>
    <td>${date}</td>
    <td class="${typeClass}">${type}</td>
    <td>${amount}</td>
    <td>${reason}</td>
  </tr>`;
}).join('');


    if (!transactionRows) {
      transactionRows = `<tr><td colspan="3">No transactions yet.</td></tr>`;
    }

    res.send(`
      <html>
        <head>
          <title>My Ninja Bank</title>
          <style>
            body {
              font-family: 'Segoe UI', sans-serif;
              background-color: #f0f4ff;
              color: #333;
              padding: 20px;
              text-align: center;
            }
            h1 {
              color: #2b6cb0;
              margin-bottom: 10px;
            }
            ul {
              list-style: none;
              padding: 0;
              font-size: 18px;
            }
            li {
              margin: 5px 0;
            }
            .obsidian { color: #2d3748; }
            .gold { color: #d69e2e; }
            .silver { color: #718096; }
            .deposit {
              color: green; 
              font-weight: bold;}
            .withdrawal {
              color: red;
              font-weight: bold;
            }
            .purchase {
              color: blue;
             font-weight: bold;
            }


            table {
              margin: 20px auto;
              border-collapse: collapse;
              width: 90%;
              max-width: 600px;
              background: white;
              border: 1px solid #ccc;
            }
            th, td {
              padding: 10px;
              border: 1px solid #ccc;
            }
            th {
              background-color: #2b6cb0;
              color: white;
            }
            a {
              display: inline-block;
              margin-top: 20px;
              color: #2b6cb0;
              text-decoration: none;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>Welcome, ${ninjaName}!</h1>
          <p>You have:</p>
          <ul>
            <li class="obsidian">🖤 Obsidian Coins: ${obsidian}</li>
            <li class="gold">💛 Gold Coins: ${gold}</li>
            <li class="silver">🥈 Silver Coins: ${silver}</li>
          </ul>

          <h2>Transaction History</h2>
          <table>
            <tr><th>Date</th><th>Type</th><th>Amount</th><th>Reason</th></tr>
            ${transactionRows}
          </table>

          <a href="/">Logout</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong.");
  }
});

app.get('/sensei-login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sensei Login - My Ninja Bank</title>
        <style>
          body {
            font-family: 'Segoe UI', sans-serif;
            background-color: #f0f4ff;
            color: #333;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          img {
            max-width: 200px;
            margin-bottom: 20px;
          }
          h1 {
            color: #2b6cb0;
            margin-bottom: 10px;
          }
          .login-form {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 350px;
            width: 100%;
          }
          input[type="text"], input[type="password"] {
            width: 100%;
            padding: 10px;
            font-size: 16px;
            margin: 10px 0;
            border: 2px solid #2b6cb0;
            border-radius: 5px;
            box-sizing: border-box;
          }
          button {
            background-color: #2b6cb0;
            color: white;
            padding: 10px 20px;
            font-size: 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
          }
          button:hover {
            background-color: #234d8c;
          }
          .error-message {
            color: #e53e3e;
            margin-top: 10px;
          }
          a {
            display: inline-block;
            margin-top: 15px;
            color: #2b6cb0;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <img src="https://www.kcstem.org/wp-content/uploads/2018/10/Code_Ninjas_Color_Vertical-300x136.png" alt="Code Ninjas Logo" />
        <div class="login-form">
          <h1>Sensei Login</h1>
          <form method="POST" action="/sensei-login">
            <input type="text" name="username" placeholder="Username" required autofocus />
            <input type="password" name="password" placeholder="Password" required />
            <button type="submit">Login</button>
          </form>
          <!-- Optionally add error message here -->
          <!-- <div class="error-message">Invalid username or password</div> -->
          <a href="/">Back to Ninja Login</a>
        </div>
      </body>
    </html>
  `);
});



app.post('/sensei-login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const records = await base('Sensei').select({
      filterByFormula: `{Username} = '${username}'`
    }).firstPage();

    if (records.length === 0) {
      return res.send(`<p style="text-align:center;">User not found. <a href="/sensei-login">Try again</a></p>`);
    }

    const sensei = records[0];
    const storedPassword = sensei.fields['Password'];

    if (password === storedPassword) {
      req.session.senseiUser = username;
      res.redirect('/add-coins');
    } else {
      res.send(`<p style="text-align:center;">Invalid password. <a href="/sensei-login">Try again</a></p>`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error during login');
  }
});

// ----------- ADD COINS PAGE (protected) -------------
// GET route to show form with Ninja options loaded
// Assuming you already have:
// const express = require('express');
// const Airtable = require('airtable');
// const app = express();
// Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY });
// const base = Airtable.base(process.env.AIRTABLE_BASE_ID);

// Middleware
app.use(express.urlencoded({ extended: true }));

// GET route to render Add Coins form
app.get('/add-coins', async (req, res) => {
  const username = req.session.senseiUser;

  if (!username) {
    return res.redirect('/sensei-login');
  }

  try {
    // Get Sensei's first name from Airtable
    const senseiRecords = await base('Sensei').select({
      filterByFormula: `{Username} = '${username}'`,
      fields: ['First Name']
    }).firstPage();

    const senseiName = senseiRecords.length > 0
      ? senseiRecords[0].fields['First Name']
      : 'Sensei';

    // Get list of Ninja names and IDs for the dropdown
    const ninjaRecords = await base('Ninjas').select({
      fields: ['Name'],
      sort: [{ field: 'Name', direction: 'asc' }]
    }).all();

    const ninjaOptions = ninjaRecords.map(ninja =>
      `<option value="${ninja.id}">${ninja.fields.Name}</option>`
    ).join('');

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Add Coins - My Ninja Bank</title>
        <style>
          body {
            font-family: 'Segoe UI', sans-serif;
            background-color: #f0f4ff;
            color: #333;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
          }
          h1 {
            color: #2b6cb0;
            margin-bottom: 5px;
          }
          h2 {
            margin: 10px 0 20px;
          }
          .form-container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 100%;
          }
          form {
            display: flex;
            flex-direction: column;
          }
          label {
            margin: 10px 0 5px;
            font-weight: bold;
          }
          select, input, textarea {
            padding: 10px;
            font-size: 16px;
            border: 2px solid #2b6cb0;
            border-radius: 5px;
            margin-bottom: 15px;
          }
          button {
            background-color: #2b6cb0;
            color: white;
            padding: 10px;
            font-size: 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          button:hover {
            background-color: #234d8c;
          }
        </style>
      </head>
      <body>
        <div class="form-container">
          <h1>Welcome Sensei ${senseiName}</h1>
          <h2>Add Coins</h2>
          <form action="/add-coins" method="POST">
            <label for="ninjaName">Ninja Name:</label>
            <select id="ninjaName" name="ninjaName" required>
              <option value="">-- Select Ninja --</option>
              ${ninjaOptions}
            </select>

            <label for="amount">Amount:</label>
            <input type="number" id="amount" name="amount" min="-100" required />

            <label for="reason">Reason:</label>
            <textarea id="reason" name="reason" rows="3" required></textarea>

            <label for="type">Transaction Type:</label>
            <select id="type" name="type" required>
              <option value="Deposit">Deposit</option>
              <option value="Withdrawal">Withdrawal</option>
              <option value="Purchase">Purchase</option>
            </select>

            <button type="submit">Submit</button>
          </form>
        </div>
      </body>
    </html>
    `);
    } catch (error) {
    console.error(error);
    res.status(500).send('Error loading Add Coins page');
  }
});



// POST route to handle form submission and add transaction
app.post('/add-coins', async (req, res) => {
  const { ninjaName, amount, reason, type } = req.body;
  const username = req.session.senseiUser || 'Unknown';

  try {
    // Lookup Sensei Name by username
    const senseiRecords = await base('Sensei').select({
      filterByFormula: `{Username} = '${username}'`,
      fields: ['Name']
    }).firstPage();

    const senseiName = senseiRecords.length > 0 ? senseiRecords[0].fields.Name : username;

    await base('Transactions').create([
      {
        fields: {
          "Ninjas": [ninjaName], // record ID from input
          "Amount": parseInt(amount),
          "Reason": reason,
          "Transaction Type": type,
          "Staff": senseiName
        }
      }
    ]);

    // Success page
    res.send(`
      <html>
        <head>
          <title>Transaction Added</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f0f4ff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
              max-width: 400px;
            }
            h1 {
              color: #2b6cb0;
              margin-bottom: 10px;
            }
            p {
              font-size: 18px;
              margin: 20px 0;
            }
            a {
              display: inline-block;
              margin: 10px;
              text-decoration: none;
              color: white;
              background-color: #2b6cb0;
              padding: 10px 20px;
              border-radius: 5px;
              font-weight: bold;
              transition: background-color 0.2s ease;
            }
            a:hover {
              background-color: #234d8c;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✅ Success!</h1>
            <p>The transaction was added successfully.</p>
            <a href="/add-coins">Add Another</a>
            <a href="/sensei-logout">Logout</a>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Error adding transaction:', err);
    res.status(500).send(`
      <html>
        <head>
          <title>Error</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #ffeef0;
              color: #86181d;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
              max-width: 400px;
            }
            h1 {
              color: #d73a49;
              margin-bottom: 10px;
            }
            a {
              display: inline-block;
              margin-top: 20px;
              color: #86181d;
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>❌ Something went wrong</h1>
            <p>We couldn’t add the transaction. Please double check your inputs and try again.</p>
            <a href="/add-coins">Try Again</a>
          </div>
        </body>
      </html>
    `);
  }
});




// --------- LOGOUT -------------
app.get('/sensei-logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/sensei-login');
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
