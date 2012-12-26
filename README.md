nimbah
======

In Visual Studio 2012 they got rid of the instant macro recorder/player. I occasionally found this 
useful for performing repetative reformatting tasks on chunks of source code.

But it was never quite right for the job anyway; it worked by recording your actions in the UI and 
then playing them back, and it was often tricky to go through the motions in the right way so that
they could be repeated effectively on all the other lines.

What's more suited is an interactive UI that allows you to build up a transformation out of the
usual functional operators (map, filter, reduce) and a few handy parsers that split strings up into
sequences of shorter strings. It should instantly show you the input and output of any step in
the transformation, and also let you drop conveniently into using simple JavaScript expressions
whenever that's the easiest way to get the result you need.

And so that's what Nimbah is all about. It takes an input text stream and turns it into an output
text stream, by passing it through a pipeline of functional operators that you can manipulate with
drag and drop.

Play with it live here: http://earwicker.com/nimbah

