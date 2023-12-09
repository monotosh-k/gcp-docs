import arg from 'arg';
import inquirer from 'inquirer';
import fs from 'fs';
import { downloadDocs } from './main.js'

function parseArgumentsIntoOptions(rawArgs) {
    const args = arg({
        '--save': String,
        '-s': '--save',
        '--fileName': String,
        '-f': '--fileName',
        '--language': String,
        '-l': '--language'
    }, 
    {
        argv: rawArgs.slice(2)
    });

    return {
        product: args._[0],
        pathToSave: args['--save'] ,
        fileName: args['--fileName'],
        language: args['--language']
    }
}

async function promptForMissingOptions(options){
    const questions = [];
    if(!options.product){
        questions.push({
            name: 'product',
            message: 'Enter name of GCP product',
            validate: (input) => {
                if(!input){
                    return 'You need to provide name of GCP product';
                }

                if(!options.fileName){
                    options.fileName = `${input}.pdf`
                }
                return true;
            }
        });
    }

    if(!options.pathToSave){
        questions.push({
            name: 'pathToSave',
            message: 'Enter path to save pdf file',
            default: './pdf/',
            validate: (input) => {
                if(!fs.existsSync(input)){
                    return `Dir ${input} doesn't exist`
                }
                
                return true;
            }
        })
    }

    if(!options.language){
        questions.push({
            type: 'list',
            name: 'language',
            message: 'Select language for sample code',
            choices: ['C#', 'Go', 'Java', 'Node.js', 'PHP', 'Python'],
            default: 'C#'
        })
    }

    const answers = await inquirer.prompt(questions);
    let product = options.product || answers.product;
    return{
        ...options,
        product: product,
        fileName: options.fileName || `${product}.pdf`,
        pathToSave: options.pathToSave || answers.pathToSave,
        language: options.language || answers.language
    }
}

export async function cli(args) {
    let options = parseArgumentsIntoOptions(args);
    options = await promptForMissingOptions(options);
    await downloadDocs(options);
}