import ExpoModulesCore
import PDFKit

class PdfReaderView: ExpoView {
  let pdf = PDFView()
  let onPageChange = EventDispatcher()
  private var url: URL?
  private var wanted = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    pdf.autoScales = true
    pdf.displayMode = .singlePage
    pdf.displayDirection = .horizontal
    pdf.usePageViewController(true, withViewOptions: nil)
    addSubview(pdf)
    NotificationCenter.default.addObserver(self, selector: #selector(changed), name: .PDFViewPageChanged, object: pdf)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    pdf.frame = bounds
  }

  func load(_ u: URL) {
    guard u != url else { return }
    url = u
    pdf.document = PDFDocument(url: u)
    go(wanted)
  }

  func go(_ i: Int) {
    wanted = i
    guard let doc = pdf.document, let page = doc.page(at: min(max(0, i), doc.pageCount - 1)), pdf.currentPage != page else { return }
    pdf.go(to: page)
  }

  @objc func changed() {
    guard let doc = pdf.document, let page = pdf.currentPage else { return }
    let i = doc.index(for: page)
    wanted = i
    onPageChange(["page": i, "of": doc.pageCount])
  }
}
