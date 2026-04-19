const decoded = '["garturlreq",["en-US","US",["FINANCE_TOP_INDICES","GENESIS_PUBLISHER_SECTION","WEB_TEST_1_0_0"],null,null,1,1,"US:en",null,null,null,null,null,null,null,false,5],"en-US","US",true,[3,5,9,19],1,true,"898728634",false,false,null,false,"CBMiogFBVV95cUxQLUFubVFtajlobFdKQllBb1JBRDNPNm8yRE51a0N2STl3SGd6eFY2cEVMdllnM1VwNGRBbWxsa0FLUGViaHNaN2p2R2oyMWFsNklvM3pFdXZFWjNNT1dNN2lrclRzWTlLOEpOLXYzZzdETnFMS0ZUZktvZTREcmU0ZzZucmFYZk0tR1gzTVlEUWh4dXVpMGMxSWltb2x2enl1TEE",1,1,null,false,1776632721,"AXDDbqX8f6RI2dzoXxdF76F9pZyr"]';
const obj = JSON.parse(decoded);
console.log("Array length:", obj.length);
console.log("Elements:", obj.map((e,i) => i + ": " + JSON.stringify(e).slice(0,40)).join("\n"));
const trimmed = [...obj.slice(0, obj.length - 6), ...obj.slice(obj.length - 2)];
console.log("\nTrimmed length:", trimmed.length);
console.log("Trimmed:", JSON.stringify(trimmed).slice(0, 300));
