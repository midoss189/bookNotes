import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import axios from "axios";
const app = express();
const port = 3000;
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "bookNotes",
  password: "12345678",
  port: 5432,
});
db.connect();
async function checklist(){
  const result = await db.query("SELECT * FROM books");
  let items = [];
  result.rows.forEach((item) => {
    items.push({'cover_id':item.cover_id,'title':item.title,'author':item.author,'publish_year':item.publish_year,'description':item.description});
  });
  return items;
}
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
//                                         ############# Home page ############
app.get("/",(req,res)=>{
    res.render("index.ejs");
})
//                                         ############# search for all books that have the query name in it's title ############
app.post("/search",async(req,res)=>{
    const bookName = req.body.search;
    try {
        const response = await axios.get(`https://openlibrary.org/search.json?q=${bookName}&fields=cover_edition_key,key,title,author_name,first_publish_year`);
        const result = response.data;
        res.render("index.ejs", { data: result,q:bookName});
      } catch (error) {
        console.error("Failed to make request:", error.message);
        res.render("index.ejs", {
          error: "activaty not found",
        });
      }
})
//                                         ############# store all book data in the database and add it to mybooks ############
app.post("/add",async(req,res)=>{
  const key=req.body.key;
  const title=req.body.title;
  const authorName=req.body.authorName;
  const coverid=req.body.coverid;
  const publish_year=req.body.publish_year;
    try{
      const response = await axios.get(`https://openlibrary.org${key}.json`);
      const result = response.data;
      if(result.description){
      await db.query("INSERT INTO books(cover_id,title,author,publish_year,description) VALUES ($1,$2,$3,$4,$5)",
        [coverid,title,authorName,publish_year,result.description]);
      }else{
        await db.query("INSERT INTO books(cover_id,title,author,publish_year,) VALUES ($1,$2,$3,$4)",
        [coverid,title,authorName,publish_year]);
      }
      res.redirect("/myBooks");
      }catch(err){res.redirect(`/info/${coverid}`);}

});
//                                            ############# show added books from the database ############
app.get("/mybooks",async(req,res)=>{
  try{
    const items = await checklist();
    res.render("myBooks.ejs", {
      data: items,
    });
    }catch(err){console.log(err);}
});
//                                            ############# show the choosen book info from the database ############
app.get("/info/:id",async(req,res)=>{
  const result = await db.query("SELECT * FROM books WHERE cover_id=$1",[req.params.id]);
  const result2 = await db.query("SELECT * FROM notes WHERE cover_id=$1 ORDER BY id ASC",[req.params.id]);
  res.render("info.ejs",{details:result.rows[0],notes:result2.rows});
})
//                                            ############# add a note to a specific book in the database ############
app.post("/addNote",async(req,res)=>{
  try{
    await db.query("INSERT INTO notes(cover_id,note) VALUES ($1,$2)",
      [req.body.coverid,req.body.note]);
    
    }catch(err){console.log(err);}
    res.redirect(`/info/${req.body.coverid}`)
})
//                                            ############# edit a specific note ############
app.post("/editNote",async(req,res)=>{
  try{
    await db.query("UPDATE notes SET note=$1 WHERE id=$2",
      [req.body.newText,req.body.note]);
    
    }catch(err){console.log(err);}
    res.redirect(`/info/${req.body.coverid}`)
})
//                                            ############# Delete a specific note ############
app.get("/deleteNote/:coverid/:id",async(req,res)=>{
  await db.query("DELETE FROM notes WHERE id=$1",[req.params.id]);
  res.redirect(`/info/${req.params.coverid}`);
})
//                                            ############# Delete a specific book ############
app.get("/delete/:id",async(req,res)=>{
  await db.query("DELETE FROM notes WHERE cover_id=$1",[req.params.id]);
  await db.query("DELETE FROM books WHERE cover_id=$1",[req.params.id]);
  res.redirect("/myBooks");
})

app.listen(port,(req,res)=>{
    console.log(`listening on port ${port}`);
});