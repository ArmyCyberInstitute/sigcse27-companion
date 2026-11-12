-- Render the repository's Markdown guides with their existing heading as the title.
function Pandoc(doc)
  local input = quarto.doc.input_file
  if not input:match('%.md$') then return doc end
  if doc.blocks[1] and doc.blocks[1].t == 'Header' and doc.blocks[1].level == 1 then
    doc.meta.title = pandoc.MetaInlines(doc.blocks[1].content)
    doc.meta.pagetitle = pandoc.MetaInlines(doc.blocks[1].content)
    doc.blocks:remove(1)
  end
  return doc
end
