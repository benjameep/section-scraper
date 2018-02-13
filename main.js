const fs = require('fs')
const puppeteer = require('puppeteer');
const sel = {
	CourseNumFromSelect: '[name$=CourseFrom]',
	CourseNumToSelect: '[name$=CourseTo]',
	SearchButton: '[name$=btnSearch]',
	ShowAll: '#pg0_V_lnkShowAll',
	TableHeaders: '#pg0_V_dgCourses th',
	TableRows: '.gbody tr',
	H: {
		Code: "course",
		Name: "name",
		Credits: "credits",
		Schedule: "schedule",
		SubProgram: "sub",
		Method: "method",
	},
	Schedules:'.schedules li',
	TermSelect: "#pg0_V_ddlTerm",
	UpdateResult: "#pg0_V_btnSearch",
}
const url = 'https://my.byui.edu/ICS/Class_Schedule/Public_Course_Search.jnz?portlet=Course_Schedules&screen=Advanced+Course+Search+BYUI'
const file = 'sections.json'

function parseTable(sel) {
	var headers = $(sel.TableHeaders).get().map(th => th.innerHTML.split(/\s+/)[0].toLowerCase())
	var table = $(sel.TableRows).get().map(row => [...row.children].reduce((o, n, i) => {
		o[headers[i]] = n;
		return o
	}, {}))
	return table.reduce((courses,row) => {
		var code = $(row[sel.H.Code]).text().trim().split('-')
		var methods = $(row[sel.H.Method]).find('li').get()
		var schedule = $(row[sel.H.Schedule])
		courses[code[0]] = courses[code[0]] || []
		courses[code[0]][Number(code[1])] = {
			course: code[0],
			section: Number(code[1]),
			code: code.join('-'),
			name: row[sel.H.Name].innerHTML.trim(),
			credits: Number(row[sel.H.Credits].innerHTML),
			schedules: schedule.find(sel.Schedules).get().map((n, i) => {
					var v = n.innerHTML.trim().match(/(M)?(T)?(W)?(R)?(F)?(S)? ?((\d{1,2}:\d\d)([APM]+)? - (\d{1,2}:\d\d) ([APM]+)),(.*?)<div/)
					return {
							days: v.slice(1, 7),
	time: v[7],
							startTime: v[8] + (v[9] || v[11]),
							endTime: v[10] + v[11],
							location: v[12].trim(),
							method: $(methods[i]).text().trim()
					}
			}),
			session: schedule.find(sel.SubSession).text().trim(),
			subProgram: row[sel.H.SubProgram].innerHTML.trim()
		}
		return courses
	},{})
}

function getOtherSemesters(terms){
	return [...terms.options].filter(option => !option.selected).map(option => option.value).filter(t => t.split(';').length ==2)
}

(async () => {
	const browser = await puppeteer.launch({
		headless: true
	});
	const page = await browser.newPage();
	await page.goto(url);
	await Promise.all([
		page.select(sel.CourseNumFromSelect, '100'),
		page.select(sel.CourseNumFromSelect, '499')
	])
	await Promise.all([
		page.waitForNavigation(),
		page.click(sel.SearchButton)
	])
	await Promise.all([
		page.waitForNavigation(),
		page.click(sel.ShowAll)
	])
	var currentTerm = await page.$eval(sel.TermSelect, terms => terms.options[terms.selectedIndex].value)
	
	var bucket = {}
	bucket[currentTerm] = await page.evaluate(parseTable,sel)
	
	var others = await page.$eval(sel.TermSelect,getOtherSemesters)
	for(var i = 0; i < others.length; i++){
		await page.select(sel.TermSelect,others[i])
		await Promise.all([
			page.waitForNavigation(),
			page.click(sel.UpdateResult)
		])
		bucket[others[i]] = await page.evaluate(parseTable,sel)
	}
	await browser.close();
	
	fs.writeFileSync(file,JSON.stringify(bucket))
})();