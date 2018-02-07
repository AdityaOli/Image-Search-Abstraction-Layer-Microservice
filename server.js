var express = require("express");
var app = express();
const GoogleImages = require('google-images');
var dateTime = require('node-datetime');
var MongoClient = require("mongodb").MongoClient;


var ResponseObject = 
{
  imageData: [imageObject],
  termData: termData,
  mostRecentSearches: [termData]
};
var imageObject=
{
  url:"",
  snippet:"",
  thumbnail:"",
  context:"" 
};
var termData = 
{
  term:"",
  when:""
};

app.get("/",(request, response)=>
{  
  if(request.query.url!=null && request.query.url!=undefined)
  {
    let offset = 0;
    if(request.query.offset!=null && request.query.offset!=undefined)
    {
      if(parseInt(request.query.offset)!=NaN)
        offset = parseInt(request.query.offset);
      else
        return "Error";
    }
    callPromise(request.query.url,offset).then(function (fulfilled) 
    {
      response.json(fulfilled);
    }).catch(function (error) 
    {
        response.json(error);
    });
  }
  else
    response.sendFile(__dirname+"/views/index.html");
});

//Assigning port number to the application
app.set('json spaces', 5);
app.listen(process.env.PORT, ()=>
{
  console.log("Listening on port 3000!");
});

function callPromise(searchString, offset)
{
  return new Promise(
    function(resolve, reject)
    {
      const client = new GoogleImages(process.env.CSE_ID, process.env.API_KEY);
      client.search(searchString,{page: offset})
        .then(images => {
          for( let i = 0 ; i < images.length ; i++ )
          {
            if(images[i]!=null)
            {  //ResponseObject.imageData.push(images[i]); 
               var imgObj = new Object();
               imgObj.url = images[i].url;
               imgObj.snippet = images[i].description;
               imgObj.thumbnail = images[i].thumbnail.url;
               imgObj.context = images[i].parentPage;
               ResponseObject.imageData.push(imgObj);
            } 
          }
          
          var dt = dateTime.create();
          termData.term = searchString;
          termData.when = dt.format('Y-m-d H:M:S');
          ResponseObject.termData = termData;
          if(termData._id != null)
          {
             delete termData._id;
          }
          insertPromisedNewRecordInDB(termData);
          getPromisedMostRecentSearches().then(function (fulfilled) 
          {
            console.log(fulfilled);
            ResponseObject.mostRecentSearches.push(fulfilled);
          }).catch(function (error) 
          {
              reject("OOPS");
          });
        
          if(ResponseObject.imageData.length>0) 
              resolve(ResponseObject);
          else
              reject("Nothing was returned!");
          });
    }
  );
}

function getPromisedMostRecentSearches()
{
  return new Promise(
      function(resolve, reject)
      {
        MongoClient.connect(process.env.MONGODB_URL,function(error, database)
          {
            if(error) throw error;
            else
            {
              var databaseObject = database.db("fcc_node_challenge_one");
              databaseObject.collection("imageSearchDB").find({}).next(function(err, result)
              {
                if(err) return(err);
                if (result !=undefined && result != null)
                {
                  database.close();
                  console.log(result);
                  resolve(result);
                } 
                else 
                {
                  reject("ERROR");
                }
              });
            }
          });
      }
)};

function insertPromisedNewRecordInDB(newRecord)
{
      MongoClient.connect(process.env.MONGODB_URL,function(error, database)
      {
        if(error) throw error;
        else
        {
          console.log("Inserting");
          var databaseObject = database.db("fcc_node_challenge_one");
          databaseObject.collection("imageSearchDB").insertOne(newRecord, function(err, result)
          {
            if(err) throw(err);
            else
            {
              database.close();
              return newRecord;
            }
          });
        }
      });
}