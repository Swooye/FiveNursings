async function getNull() { return null; }
async function test() {
    const contextData = await getNull() || { currentSymptoms: "123" };
    console.log("contextData is:", contextData);
}
test();
