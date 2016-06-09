// teletext
var mypage;
var ttxFont;

//metrics
var gTtxW;
var gTtxH;
var gTtxFontSize=20;

// page selection
var digit1='1';
var digit2='0';
var digit3='0';

var hdr;

// comms
var socket;

// state
var editMode=false;

// dom
var redButton;

function preload()
{
  ttxFont=loadFont("assets/teletext2.ttf"); // Normal  
  ttxFontDH=loadFont("assets/teletext4.ttf"); // Double height 
}

function setup()
{
  // Try to make a debug and on-air version
//  socket=io.connect('http://192.168.1.11:3010');
  socket=io.connect('http://23.251.131.26:8080');
  // socket=io.connect('http://localhost:80');
  createCanvas(600,550);
  background(0);
  // font metrics
  textFont(ttxFont);
  textSize(gTtxFontSize);
  gTtxW=textWidth('M');
  gTtxH=gTtxFontSize;
  mypage=new page();
  mypage.init(100);
  // message events
  socket.on('keystroke',newChar);
  socket.on('row',setRow);
  socket.on('blank',setBlank);
  socket.on('fastext',setFastext);
  socket.on('setpage',setPageNumber);
  socket.on('description',setDescription);
  //hdr=new header(0,1,0,0);
  // Set page defaults
  var data=
  {
	S: 0, // Default to service 0
	p: 100, // Page mpp. 
	s:0,	// subpage 0
	x:2000,
	y: 0,
	rowText: ''
  }
  socket.emit('load',data); // 
  // dom
  redButton=select('#red');
  redButton.mousePressed(fastextR);
  greenButton=select('#green');
  greenButton.mousePressed(fastextG);
  yellowButton=select('#yellow');
  yellowButton.mousePressed(fastextY);
  cyanButton=select('#cyan');
  cyanButton.mousePressed(fastextC);
}

function setDescription(desc)
{
	// console.log('[setDescription]setting page description to '+desc);
	mypage.description=desc;
	document.getElementById('description').innerHTML = 'Page info: '+desc;
}

function setPageNumber(data)
{
	console.log('[setPageNumber]setting page to '+data.p);
	mypage.setPage(data.p);
}

// Handle the button UI
function fastextR()
{
	fastext(1);
}
function fastextG()
{
	fastext(2);
}
function fastextY()
{
	fastext(3);
}
function fastextC()
{
	fastext(4);
}
 
/**
 * Load the fastext link
 * @param index 0..3
 */
function fastext(index)
{
	console.log('Fastext pressed: '+index);
	switch (index)
	{
	case 1:page=mypage.redLink;break;
	case 2:page=mypage.greenLink;break;
	case 3:page=mypage.yellowLink;break;
	case 4:page=mypage.cyanLink;break;
	default:
		page=mypage.redLink;
	}
	mypage.setPage(page); // We now have a different page number
	  var data=
	  {
		S: 0, // @todo Implement service
		p: page, // Page mpp
		s: 0,	// @ todo subpage	
		x: 0,
		y: 0,
		rowText: ''
	  }	
	socket.emit('load',data);	
}

function setFastext(data)
{
  if (!matchpage(data)) return; // Data is not for our page?
	mypage.redLink=data.fastext[0];
	mypage.greenLink=data.fastext[1];
	mypage.yellowLink=data.fastext[2];
	mypage.cyanLink=data.fastext[3];
}

function draw()
{
  background(0);
  noStroke();
  fill(255,255,255);
  // ellipse(mouseX,mouseY,10,10);
  mypage.draw();
}

// Does our page match the incoming message?
function matchpage(data)
{
	// console.log ("Matching data.p, mypage.pageNumber"+data.p+' '+mypage.pageNumber);
	if (mypage.service!=data.S) return false;
	if (mypage.pageNumber!=data.p) return false;
	if (mypage.subpage!=data.s) return false;
	return true;
}

// Message handlers....
function newChar(data) // 'keystroke'
{
  //if (data.k<' ')
  // console.log("returned keycode="+(data.k));
  // @todo page number test
  if (!matchpage(data)) return; // Char is not for our page?
  mypage.drawchar(data.k,data.x,data.y);
  mypage.cursor.right();  
}

// A whole line is updated at a time
function setRow(r) // 'row'
{
  console.log("Going to set row="+(r.rowNumber));
  if (!matchpage(r)) return;
  mypage.setRow(r.y,r.rowText);
}

// Clear the page to blank (all black)
function setBlank(data) // 'blank'
{
  if (!matchpage(data)) return;
  mypage.setBlank();
}

// cursor class (might be a good idea to put this in a separate class)
function myCursor(number)
{
  this.x=0;
  this.y=0;
  this.hide=true;
  
  this.right = function(t)
  {
    this.x++;
    if (this.x>39) this.x=39;
    return this.x;
  };
  
  this.left=function()
  {
    this.x--;
    if (this.x<0) this.x=0;
    return this.x;
  };
  this.up=function()
  {
    this.y--;
    if (this.y<0) this.y=0;
    return this.y;
  };
  this.down=function()
  {
    this.y++;
    if (this.y>24) this.y=24;
    return this.y;
  };
  this.moveTo=function(x,y)
  {
    this.x=constrain(x,0,39);
    this.y=constrain(y,0,24);
  }
}



function keyPressed()
{
  switch (keyCode)
  {
  case LEFT_ARROW: mypage.cursor.left();break;
  case RIGHT_ARROW: mypage.cursor.right();break;
  case UP_ARROW: mypage.cursor.up();break;
  case DOWN_ARROW: mypage.cursor.down();break;
  case ESCAPE: editMode=!editMode;mypage.cursor.hide=!editMode;break;
  default:
    //console.log('unhandled keycode='+keyCode)
	;
  }
}

/** edit mode is entered if any non numeric code is typed
 *  edit mode exits if <esc> is pressed
 */
function keyTyped()
{	
	if (editMode==true) // Numbers are typed into the page
	{
      var data=
      {
		S: 0, // service number		
        p: mypage.pageNumber,
		s: mypage.subpage,
        k: key,
        x: mypage.cursor.x,
        y: mypage.cursor.y
      }
      socket.emit('keystroke', data);
      newChar(data);
    }
	else // Numbers are used for the page selection
	{
		if (key>='0' && key <='9')
		{
			if (digit1!=' ') // A new number started
			{
				digit2=' '; // Clear the new page number
				digit3=' ';
			}
		    digit1=digit2;
			digit2=digit3;
			digit3=key;
			if (digit1!=' ')
			{
				var page=Number(digit1+digit2+digit3);
				// hdr.setPage(page);
				// console.log('@todo: pass the page '+page);
				console.log("Page number is "+digit1+digit2+digit3);
				mypage.setPage(page); // We now have a different page number
				  var data=
				  {
					S: 0, // @todo Implement service
					p: page, // Page mpp
					s: 0,	// @ todo subpage	
					y: 0,
					rowText: ''
				  }				
				socket.emit('load',data);
			}
		}
	}
    
    // socket.emit('load');
    
    //console.log('keycode='+key);
	
}

function mouseClicked()
{
  var xLoc=int(mouseX/gTtxW);
  var yLoc=int(1+mouseY/gTtxH); // @todo Will need to fix this once we add a header
  mypage.cursor.moveTo(xLoc,yLoc);
  // console.log('The mouse was clicked at '+xLoc+' '+yLoc);
}
