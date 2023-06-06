
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/todolistDB", {useNewUrlParser: true});

const itemsSchema = new mongoose.Schema({name: String});

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({name: "Brush Teeth"});
const item2 = new Item({name: "Chew Bublegum"});
const item3 = new Item({name: "Kick Ass"});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

async function asyncGetItems(list) {
  itemLength = await Item.countDocuments({});
  
  if (itemLength === 0){
    await Item.insertMany(defaultItems);

    const cursor = Item.find({});
    for await (const doc of cursor){
      list.push(doc);
    }
  } else { 
    const cursor = Item.find({});
    for await (const doc of cursor){
      list.push(doc);
    }
  }
};

app.get("/",async function(req, res) {

  const databaseItems = [];
  await asyncGetItems(databaseItems);

  res.render("list", {listTitle: "Today", newListItems: databaseItems});
});

app.get("/:customListName", async function(req, res){
  const customListName = _.capitalize(req.params.customListName);

  var foundList = await List.findOne({name: customListName});

  if (foundList == null){
    console.log('list doesn\'t exist, creating new list...')
    const list = new List ({
      name: customListName,
      items: defaultItems
    });
  await list.save();

  var foundList = await List.findOne({name: customListName});

  } else {
    console.log('list found')
  }

  res.render("list", {listTitle: foundList.name, newListItems: foundList.items} )
  
});

app.post("/", async function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const newItem = new Item({name: itemName});

  if (listName === "Today"){
    await newItem.save();
    res.redirect('/');
  } else {
    const foundList = await List.findOne({name: listName});
    await foundList.items.push(newItem);
    await foundList.save();
    res.redirect('/' + listName);
  }
});

app.post("/delete", async function(req,res){
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === 'Today'){
    await Item.findByIdAndRemove(checkedItemId);
  res.redirect('/');
  } else {
    // finds the list by the name
    const x = await List.findOne({name: listName});
    // gets the item array(?), (when using typeof returns -> object)
    const y = x.items

    // function for .filter method, filters out the checked item
    function excludeId(object) {
      return object.id !== checkedItemId;
    }
    // creates a new list without the checked item
    const filteredList = y.filter(excludeId)
    
    // updates the database with the new list
    await List.findOneAndUpdate({items: y}, {items: filteredList})
    // redirects the page to see the updated list
    res.redirect("/" + listName);
  }
});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000 :3");
});
