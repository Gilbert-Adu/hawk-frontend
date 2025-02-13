const express = require("express");
const path = require('path');
const axios = require("axios");
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');




const app = express();
app.use(express.json());

const port = 3000;


app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to parse cookies
app.use(cookieParser());

  

//home
app.get("/", async(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
 
});



//login
app.post("/login", async (req, res) => {
    try {
        const response = await axios.post("http://52.91.166.60:5000/api/login", req.body);
        const userData = response.data;
        const name = userData['name'].split(" ")[0];
        let user = {
            'name': name,
            'email': userData['email']
        }

        res.cookie('username', name, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true }); // 30 days expiration
        res.cookie('email', userData['email'], { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.cookie('user_id', userData['id'], { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.cookie('status', userData['Subscribed'], { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });


    
        //res.render('dashboard', {'user': user})
        res.redirect('/dashboard')


    }catch(err) {
        console.log("an error occurred: ", err.message)
    }

})

app.get("/dashboard", async (req, res) => {

    try {
        let username = req.cookies.username;
        let email = req.cookies.email;
        let user_id = req.cookies.user_id;
        let status = req.cookies.Subscribed;

    
    
        const params = {
            'name': username,
            'email': email,
            'user_id': user_id,
            'status': status

        }
    
        //get user 
        let user = await axios.get("http://52.91.166.60:5000/api/user", {params});
        let campaigns = await axios.get("http://52.91.166.60:5000/api/get-user-campaigns", {params});
        let leads = await axios.get("http://52.91.166.60:5000/api/get-total-leads", {params});

    
    
        //console.log(user);
    
        let details = {
            "name": user.data.name.split(" ")[0],
            "email": user.data.email,
            "status": user.data.Subscribed
        }
        const messaged_count = leads.data.filter(item => item.message_sent === true).length;
        const conversion_rate = (messaged_count / leads.data.length) * 100
        res.render('dashboard', {'user': details, 'campaigns': campaigns.data, 'leads': leads.data, 'total_leads': leads.data.length, 'conversion_rate': conversion_rate})
    

    }catch(err) {
        console.log(err.message)
    }


})



app.post("/create-campaign", async(req, res) => {

    let user_id = req.cookies.user_id

    let {campaign_name, campaign_location, campaign_desc, campaign_service} = await req.body;
    let payload = {
        'user_id': user_id,
        'campaign_name': campaign_name,
        'campaign_location': campaign_location,
        'campaign_desc': campaign_desc,
        'campaign_service': campaign_service
    }
    const response = await axios.post("http://52.91.166.60:5000/api/create-campaign", payload);


    res.redirect('/dashboard')
});

app.get("/delete-campaign/:campaign_id", async(req, res) => {

    const {campaign_id} = req.params;
    const params = {
        'campaign_id': campaign_id
    }
    const response = await axios.get("http://52.91.166.60:5000/api/delete-campaign", {params});


    res.redirect('/dashboard')

})

app.get("/payments", (req, res) => {

    res.render("payments")
})

app.get("/admin/payments-tracker", (req, res) => {
    res.render("payments-tracker")
})

app.post("/change-subscription-status", async(req, res) => {
    let {user_email, subscription} = req.body;


    const params = {
        'email': user_email,
        'subscription': subscription,

    }

    //get user 
    let user = await axios.get("http://52.91.166.60:5000/api/change-payment-status", {params});
    res.redirect("/admin/payments-tracker")
    
})

app.get("/join", (req, res) => {
    res.render("signup", {'error':false, 'message': ''})
})
//register
//http://52.91.166.60:5000/api/register
app.post("/register", async(req, res) => {

    try {
        const response = await axios.post("http://52.91.166.60:5000/api/register", req.body);
        const userData = response.data;
        const name = userData['name'].split(" ")[0];
        let user = {
            'name': name,
            'email': userData['email']
        }
        
        //res.render('dashboard', {'user': user})
        res.render('dashboard', {'user': user, 'campaigns': [], 'leads': [], 'total_leads': [], 'conversion_rate': []})

    }catch(err) {
        console.log("an error occurred: ", err.message)
        console.log("error code: ", err.status);
        if (err.status == 403) {
            res.render('signup', {'error': true, 'message': 'You might already have an account with us. Please sign in with your credentials.'})

        }


    }
})

app.get("/important-info", (req,res) => {

    res.render("business-info")
})

app.post("/submit-business-info", async(req, res) => {
    let {name, email, phone, businessName, businessLocation, services, shipping, fastest_reach} = req.body
    await axios.post('http://52.91.166.60:5000/api/create-business', req.body);
    res.redirect("/important-info")
})

//logout



app.post("/admin/create-lead", async(req, res) => {

    try {

        let {user_email, campaign_name, lead_name, lead_location, lead_source, lead_post, lead_contact} = req.body
        
        const response = await axios.post("http://52.91.166.60:5000/api/create-lead", req.body);
        res.sendFile(path.join(__dirname, 'public', 'index.html'))




    }catch(err) {
        console.log("an error occurred: ", err.message)


    }
})
app.get("/admin/generate-lead", async(req, res) => {
    res.render("user_email")
})

//form to submit all fields of lead
app.post("/admin/lead-first-steps", async(req, res) => {
    let email = req.body.email;
    const campaigns = await axios.get(`http://52.91.166.60:5000/api/campaigns/${email}`)
    res.render("lead_entry", {"campaigns": campaigns.data, "email": email})
});

//-----------------------------separate---------------------
//fetch all users
app.get("/get-all-users", async(req, res) => {
    return response.data;
    
})



app.listen(port, () => {
    console.log("server running on 3000")
})