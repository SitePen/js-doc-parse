var a = true, x = a && a ? "pass" : "fail";

if (x || a) {
	var b = "pass";
}
else {
	b = "fail";
}

if (x === a) {
	var c = "pass";
}
else {
	c = "fail";
}