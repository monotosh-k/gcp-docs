# gcp-docs
Download Google Cloud Platform's docs in PDF format

### Requirements
This project uses PDFMerge which in turn uses [PDFtk](https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/) to merge the documents and as such it is a requirement in order for PDFMerge to work. It will work on any platform supported by [PDFtk](https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/).
Starting from v1.0.0 a requirement of Node >= 4.0.0 is required as well. If you are stuck in the dark ages then `npm i pdf-merge@0.1.1` should still work.

### Installing PDFtk
#### Windows
Download and run the [Installer](https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/).

#### Debian, Ubuntu
```
apt-get install pdftk
```
#### RPM
https://www.pdflabs.com/docs/install-pdftk-on-redhat-or-centos/


### Installing gcp-docs
```
npm link
```

### Running gcp-docs
```
gcp-docs
? Enter name of GCP product firestore
? Enter name of sub-product(optional) 
? Enter path to save pdf file ./
? Select language for sample code (Use arrow keys)
❯ C# 
  Go 
  Java 
  Node.js 
  PHP 
  Python 
```