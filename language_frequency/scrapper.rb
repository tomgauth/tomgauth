require 'nokogiri'
require 'open-uri'

word_fr = "bonjour"
url = 'http://tatoeba.org/fra/sentences/search?query=#{word_fr}&from=fra&to=por'

html_file = open(url)

doc = Nokogiri::HTML(html_file)


doc.search('.translation').each do |elm|
  puts elm
  word_pt = elm
end

puts "word_fr: #{word_fr}, word_pt #{word_pt}"
