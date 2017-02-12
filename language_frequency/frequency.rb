text = ""
io = File.open("./text.txt", "r")
io.each_line do |line|
  text += line
end

frequencies = {}
words = text.split
words.each do |word|
  if frequencies.key?(word)
    frequencies[word] += 1
  else
    frequencies[word] = 1
  end
end

puts frequencies.sort
