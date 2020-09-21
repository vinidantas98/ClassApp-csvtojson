var fs = require('fs');
var _ = require('lodash');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

// Usa fs.readFile para ler o input.csv e envia os dados para a função csvtojson, depois usa fs.writeFileSync para criar o arquivo output.json
fs.readFile('./input.csv', 'utf8', function(err, data){     
    fs.writeFileSync('output.json', JSON.stringify(csvtojson(data), null, 2));
})

// csvtojson: Recebe os dados do input.csv e retorna a função da lodash zipObject com os dados do json
function csvtojson(csv){
    let content = csv.split('\n');
    // Utiliza o regex (https://regexr.com/5cftu) na função split para dividir o header do csv sem dividir nas vírgulas dentro das aspas e chama a função trimQuotes para remover as aspas após o split
    let header = trimQuotes(content[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)); 
    // Retorna a função checkRepetion enviando como parametro a função da lodash zipObject
    return checkRepetion(_.tail(content).map((content) => {     
        let row = trimQuotes(content.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        let fullname = row[0];
        let eid = row[1];
        // Chama a função createClasses que retorna um array com as salas do aluno em questão
        let classes = createClasses(row[2], row[3]);
        // Chama a função createAddress que retorna um array com todos os endereços do aluno em questão
        let addresses = createAddress(row, header);
        let invisible = (row[10] && row[10] != "no" && row[10] != "0") ? true : false;
        let see_all = (row[11] && row[11] != "no" && row[11] != "0") ? true : false;
        // Retorna a função da lodash zipObject (https://lodash.com/docs/4.17.15#zipObject)
        return _.zipObject(["fullname", "eid", "classes", "addresses", "invisible", "see_all"], [fullname, eid, classes, addresses, invisible, see_all]);
    }));
};

// trimQuotes: Recebe um array e utiliza a função da lodash trim (https://lodash.com/docs/4.17.15#trim) para remover as aspas de cada instancia do vetor
function trimQuotes(stringArray){
    for (var i = 0; i < stringArray.length; i++)
        stringArray[i] = _.trim(stringArray[i], '"');
    return stringArray;
}

// createClasses: Recebe os dados das colunas "class" do csv e retorna um array com todas as salas do aluno em questão
function createClasses(class1, class2){
    let classes = [];
    if(class1 != "")
        // Utiliza um regex na função split para dividir o dado em virgula ou barra caso exista mais de uma sala em um único campo ex(Sala 1, Sala2 / Sala 3)
        for (let k = 0; k < class1.split(/[/,]/).length; k++) 
            classes.push(_.trim(class1.split(/[/,]/)[k], ' '));
    if(class2 != "")
        for (let k = 0; k < class2.split(/[/,]/).length; k++) 
            classes.push(_.trim(class2.split(/[/,]/)[k], ' '));
    return classes;
}

// createAddress: Recebe um array com a linha de dados do aluno em questão e um array com o header de cada dado e retorna un array com todos os endereços
function createAddress(row, header){
    let addresses = [];
    // Cada aluno tem 6 endereços (row[4] ... row[9]), com um loop de 0 até 5 percorremos cada endereço
    for (let i = 0; i < 6; i++) {
        if(row[4 + i] != ""){
            // Dividimos o header do dado onde há espaço (" ") ex (email Responsável, Pai -> "email","Responsável,","Pai")
            let headerSplit = header[i + 4].split(" ");
            // Se a primeira palavra do headerSplit for "phone" envia o dado para a função validateNumber que retorna true se o numero de telefone for valido ou false caso contrário
            if(headerSplit[0] != "phone" || validatePhoneNumber(row[4+i])){
                let aux = {};
                aux.tags = [];
                // Utiliza a primeira palavra do headerSplit como o tipo do endereço (phone ou email)
                aux.type = headerSplit[0];
                // Utiliza um loop de 1 até o tamanho de headerSplit para gerar as tags utilizando a função trim para remover vírgulas caso necessário
                for (let j = 1; j < headerSplit.length; j++) 
                    aux.tags[j-1] = _.trim(headerSplit[j], ',');
                // Se o tipo do endereço for "phone" utiliza a função phoneUtil.parse da biblioteca google-libphonenumber para normaliza-lo
                aux.address = aux.type != "phone" ? row[4 + i] : "55"+phoneUtil.parse(row[4 + i], 'BR').values_[2];
                addresses.push(aux);
            }
        }
    }
    return addresses;
}


// validadePhoneNumber: Recebe um número de telefone e utiliza a função phoneUtil.isValidNumberForRegion da biblioteca google-libphonenumber para verificar se o número é valido para o Brasil
function validatePhoneNumber(number){
    try{ 
        return phoneUtil.isValidNumberForRegion(phoneUtil.parse(number, 'BR'), 'BR');
    }catch{
        return false;
    }
}

// validateEmail: Recebe um email e utiliza um regex para verificar se o email é um email válido ou não
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

// checkRepetion: Recebe o array gerado pela função zipObject, trata informações duplicadas ou repetidas e retorna o array tratado
function checkRepetion(json){
    // Utiliza um for para passar por cada instancia do array
    for (let i = 0; i < json.length; i++) {
        for (let j = i + 1; j < json.length; j++) {
            // Verifica se existe 2 dois alunos com o mesmo eid, se sim, passa as informações do segundo para o primeiro e exclui o segundo do array com a função splice
            if (json[i].eid == json[j].eid) {
                for (let k = 0; k < json[j].classes.length; k++) 
                    json[i].classes.push(json[j].classes[k]);
                for (let k = 0; k < json[j].addresses.length; k++) 
                    json[i].addresses.push(json[j].addresses[k]);
                json[i].invisible = (json[i].invisible || json[j].invisible);
                json[i].see_all = (json[i].see_all || json[j].see_all);
                json.splice(j, 1);
            }
        }
        for (let k = 0; k < json[i].addresses.length; k++) {
            for (let l = k + 1; l < json[i].addresses.length; l++) {
                // Verifica repetição de endereço em um aluno, se sim, copia as tags do segundo para o primeiro e exclui o segundo endereço com a função splice
                if(json[i].addresses[k].address == json[i].addresses[l].address){
                    json[i].addresses[k].tags.push(json[i].addresses[l].tags[0])
                    json[i].addresses.splice(l, 1)
                }
            }
            // Verifica se dentro de um endereço do tipo email existe mais de um email dividi por barra ("/")
            if(json[i].addresses[k].type == "email"){
                let emailSplit = json[i].addresses[k].address.split("/");
                // Se sim, verifica cada email com a função validateEmail e depois cria novos endereços um com cada email e com as mesmas tags e exclui o que possuia a barra, caso contrário apenas verifica se o email é valido
                if(emailSplit.length > 1){
                    emailSplit.map((email) => {
                        if(validateEmail(email)){
                            let aux = {};
                            aux.tags = [];
                            json[i].addresses[k].tags.map((tag) => {
                                aux.tags.push(tag);
                            })
                            aux.type = json[i].addresses[k].type
                            aux.address = email;
                            json[i].addresses.push(aux);
                        }
                    });
                    json[i].addresses.splice(k, 1)
                }else if(!validateEmail(emailSplit))
                    json[i].addresses.splice(k, 1)
            }
        }
    }
    return json;
}