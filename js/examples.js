var examples = [
    {
        title: 'Put brackets around each line',
        load: function() {
            load([
                {"name":"split","separator":"\n"},
                {"name":"map","withEachItem":
                    [
                        {"name":"sequence","items":
                            [
                                [{"name":"constant","value":"("}],
                                [{"name":"trim"}],
                                [{"name":"constant","value":")"}]
                            ]
                        },
                        {"name":"reduce","expression":"l + r"}
                    ]
                },
                {"name":"reduce","expression":"l + '\\n' + r"}
            ]);
        }
    },
    {
        title: 'Convert HTML table into JSON',
        load: function() {
            load([
                {"name":"html","tag":"tr","fetch":"innerHTML"},
                {"name":"map","withEachItem":
                    [
                        {"name":"html","tag":"td","fetch":"innerText"},
                        {"name":"sequence","items":
                            [
                                [{"name":"constant","value":"{ code: \""}],
                                [{"name":"pick","item":"0"}],
                                [{"name":"constant","value":"\", country: \""}],
                                [{"name":"pick","item":"2"}],
                                [{"name":"constant","value":"\" }"}]
                            ]
                        },
                        {"name":"reduce","expression":"l + r"}
                    ]
                },
                {"name":"reduce","expression":"l + ',\\n' + r"}
            ]);
            viewModel.inputText(htmlTable);
        }
    },
    {
        title: 'Convert plain text into a JavaScript string literal',
        load: function() {
            load([
                {"name":"split","separator":"\n"},
                {"name":"map","withEachItem":
                    [
                        {"name":"sequence","items":
                            [
                                [{"name":"constant","value":"'"}],
                                [{"name":"split","separator":"'"},{"name":"reduce","expression":"l + \"\\\\'\" + r"}],
                                [{"name":"constant","value":"\\n'"}]
                            ]
                        },
                        {"name":"reduce","expression":"l + r"}
                    ]
                },
                {"name":"reduce","expression":"l + ' + \\n' + r"}
            ]);
            viewModel.inputText(
                'Once upon a time there was some text.\n' +
                'It split over several lines, and contained some so-called \'quotation\' marks\n' +
                'But one day, it woke up inside Nimbah and was instantly converted into a JS string literal\n');
        }
    }, {
        title: 'Declare C# string constants',
        load: function() {
            load([
                {"name":"split","separator":"\n"},
                {"name":"map","withEachItem":
                    [
                        {"name":"sequence","items":
                            [
                                [{"name":"constant","value":"public const string "}],
                                [
                                    {"name":"substring","start":0,"count":1},
                                    {"name":"js","expression":"context.toUpperCase()"}
                                ],
                                [{"name":"substring","start":1,"count":1000}],
                                [{"name":"constant","value":" = \""}],
                                [],
                                [{"name":"constant","value":"\";"}]
                            ]
                        },
                        {"name":"reduce","expression":"l + r"}
                    ]
                },
                {"name":"reduce","expression":"l + \"\\n\" + r"}
            ]);
            viewModel.inputText(
                'red\n' +
                'orange\n' +
                'yellow\n' +
                'green\n' +
                'blue\n' +
                'indigo\n' +
                'violet\n'
            );
        }
    }
];