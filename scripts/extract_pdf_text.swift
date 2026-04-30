import Foundation
import PDFKit

guard CommandLine.arguments.count == 2 else {
  fputs("usage: swift -module-cache-path /tmp/swift-module-cache scripts/extract_pdf_text.swift <pdf-path>\n", stderr)
  exit(1)
}

let path = CommandLine.arguments[1]
let url = URL(fileURLWithPath: path)

guard let document = PDFDocument(url: url) else {
  fputs("unable to open PDF: \(path)\n", stderr)
  exit(1)
}

for index in 0..<document.pageCount {
  guard let page = document.page(at: index), let text = page.string else {
    continue
  }

  print(text)
  if index + 1 < document.pageCount {
    print("\n")
  }
}
